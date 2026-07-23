import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseClaimStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitExpenseClaimDto } from './dto/submit-expense-claim.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  submit(employeeId: string, dto: SubmitExpenseClaimDto) {
    return this.prisma.expenseClaim.create({
      data: {
        employeeId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        expenseDate: dto.expenseDate,
        receipts: dto.receiptUrls
          ? { createMany: { data: dto.receiptUrls.map((fileUrl) => ({ fileUrl })) } }
          : undefined,
      },
      include: { receipts: true },
    });
  }

  listForEmployee(employeeId: string) {
    return this.prisma.expenseClaim.findMany({
      where: { employeeId },
      include: { receipts: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPendingForApprover(actingUser: AuthenticatedUser) {
    const isHrOverride = actingUser.role === Role.SUPER_ADMIN || actingUser.role === Role.HR_ADMIN;
    return this.prisma.expenseClaim.findMany({
      where: {
        status: ExpenseClaimStatus.PENDING,
        ...(isHrOverride ? {} : { employee: { managerId: actingUser.employeeId } }),
      },
      include: { receipts: true, employee: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decide(claimId: string, actingUser: AuthenticatedUser, approve: boolean, note?: string) {
    const claim = await this.prisma.expenseClaim.findUnique({
      where: { id: claimId },
      include: { employee: true },
    });
    if (!claim) throw new NotFoundException('Expense claim not found');
    if (claim.status !== ExpenseClaimStatus.PENDING) {
      throw new BadRequestException('This claim has already been decided');
    }

    const isHrOverride = actingUser.role === Role.SUPER_ADMIN || actingUser.role === Role.HR_ADMIN;
    const isDirectManager = actingUser.employeeId === claim.employee.managerId;
    if (!isHrOverride && !isDirectManager) {
      throw new ForbiddenException("Only the employee's manager or HR can decide this claim");
    }

    const updated = await this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: {
        status: approve ? ExpenseClaimStatus.APPROVED : ExpenseClaimStatus.REJECTED,
        approverId: actingUser.employeeId ?? undefined,
        decisionNote: note,
        decidedAt: new Date(),
      },
    });

    await this.notify(claim.employeeId, approve ? 'Expense claim approved' : 'Expense claim rejected', note);
    return updated;
  }

  async markReimbursed(claimId: string) {
    const claim = await this.prisma.expenseClaim.findUniqueOrThrow({ where: { id: claimId } });
    if (claim.status !== ExpenseClaimStatus.APPROVED) {
      throw new BadRequestException('Only approved claims can be marked reimbursed');
    }
    const updated = await this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: ExpenseClaimStatus.REIMBURSED, reimbursedAt: new Date() },
    });
    await this.notify(claim.employeeId, 'Expense reimbursed', `₹${claim.amount.toFixed(2)} has been reimbursed.`);
    return updated;
  }

  private async notify(employeeId: string, title: string, message?: string) {
    const user = await this.prisma.user.findUnique({ where: { employeeId } });
    if (!user) return;
    await this.notifications.notify({ userId: user.id, title, message: message ?? title });
  }
}
