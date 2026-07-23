import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaysService } from './holidays.service';
import { NotificationsService } from '../notifications/notifications.service';
import { countWorkingDays } from './working-days.util';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const COMP_OFF_LEAVE_TYPE_NAME = 'Comp Off';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private holidays: HolidaysService,
    private notifications: NotificationsService,
  ) {}

  async apply(employeeId: string, dto: ApplyLeaveDto) {
    if (dto.endDate.getTime() < dto.startDate.getTime()) {
      throw new BadRequestException('endDate cannot be before startDate');
    }
    if (dto.isHalfDay && dto.startDate.toDateString() !== dto.endDate.toDateString()) {
      throw new BadRequestException('isHalfDay is only valid for a single-day request');
    }

    const leaveType = await this.prisma.leaveType.findUniqueOrThrow({ where: { id: dto.leaveTypeId } });

    const dayCount = dto.isHalfDay
      ? 0.5
      : countWorkingDays(dto.startDate, dto.endDate, await this.holidays.findAllDatesInRange(dto.startDate, dto.endDate));

    if (dayCount <= 0) {
      throw new BadRequestException('The selected range has no working days to apply leave for');
    }

    // Leave types with no default annual allocation (e.g. Work From Home, Comp Off)
    // are not balance-checked here — WFH is uncapped by policy, and Comp Off is
    // gated by credit availability at approval time instead.
    if (leaveType.defaultAnnualDays > 0) {
      const balance = await this.getBalance(employeeId, leaveType.id, dto.startDate.getFullYear());
      if (dayCount > balance) {
        throw new BadRequestException(
          `Insufficient ${leaveType.name} balance: requested ${dayCount}, available ${balance}`,
        );
      }
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isHalfDay: !!dto.isHalfDay,
        dayCount,
        reason: dto.reason,
      },
      include: { leaveType: true },
    });
  }

  async getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<number> {
    const [allocation, leaveType, approvedRequests] = await Promise.all([
      this.prisma.leaveAllocation.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      }),
      this.prisma.leaveType.findUniqueOrThrow({ where: { id: leaveTypeId } }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeId,
          leaveTypeId,
          status: LeaveRequestStatus.APPROVED,
          startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
        },
      }),
    ]);

    const allocated = allocation?.allocatedDays ?? leaveType.defaultAnnualDays;
    const carriedForward = allocation?.carriedForwardDays ?? 0;
    const used = approvedRequests.reduce((sum, r) => sum + r.dayCount, 0);
    return allocated + carriedForward - used;
  }

  async myBalances(employeeId: string, year: number) {
    const leaveTypes = await this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
    return Promise.all(
      leaveTypes.map(async (leaveType) => ({
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        balance: await this.getBalance(employeeId, leaveType.id, year),
      })),
    );
  }

  listForEmployee(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPendingForApprover(actingUser: AuthenticatedUser) {
    const isHrOverride = actingUser.role === Role.SUPER_ADMIN || actingUser.role === Role.HR_ADMIN;
    return this.prisma.leaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.PENDING,
        // HR/Super Admin see every pending request (matches the override they
        // already have in decide()); a manager only sees their direct reports'.
        ...(isHrOverride ? {} : { employee: { managerId: actingUser.employeeId } }),
      },
      include: { leaveType: true, employee: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async cancel(employeeId: string, requestId: string) {
    const request = await this.prisma.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    return this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: LeaveRequestStatus.CANCELLED },
    });
  }

  async decide(requestId: string, actingUser: AuthenticatedUser, approve: boolean, note?: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: true, leaveType: true },
    });
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been decided');
    }

    const isHrOverride = actingUser.role === Role.SUPER_ADMIN || actingUser.role === Role.HR_ADMIN;
    const isDirectManager = actingUser.employeeId === request.employee.managerId;
    if (!isHrOverride && !isDirectManager) {
      throw new ForbiddenException('Only the employee\'s manager or HR can decide this request');
    }

    if (approve && request.leaveType.name === COMP_OFF_LEAVE_TYPE_NAME) {
      const credit = await this.prisma.compOffCredit.findFirst({
        where: { employeeId: request.employeeId, isUsed: false, expiresAt: { gte: new Date() } },
        orderBy: { earnedForDate: 'asc' },
      });
      if (!credit) {
        throw new BadRequestException('No unused, unexpired comp-off credit available for this employee');
      }
      await this.prisma.compOffCredit.update({
        where: { id: credit.id },
        data: { isUsed: true, usedInRequestId: request.id },
      });
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? LeaveRequestStatus.APPROVED : LeaveRequestStatus.REJECTED,
        approverId: actingUser.employeeId ?? undefined,
        decisionNote: note,
        decidedAt: new Date(),
      },
    });

    await this.notifyDecision(request.employeeId, request.leaveType.name, approve, note);
    return updated;
  }

  private async notifyDecision(employeeId: string, leaveTypeName: string, approved: boolean, note?: string) {
    const user = await this.prisma.user.findUnique({ where: { employeeId } });
    if (!user) return;
    await this.notifications.notify({
      userId: user.id,
      title: approved ? 'Leave request approved' : 'Leave request rejected',
      message: note
        ? `Your ${leaveTypeName} request was ${approved ? 'approved' : 'rejected'}: ${note}`
        : `Your ${leaveTypeName} request was ${approved ? 'approved' : 'rejected'}.`,
    });
  }
}
