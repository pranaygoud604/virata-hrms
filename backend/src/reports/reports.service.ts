import { Injectable } from '@nestjs/common';
import { EmployeeStatus, ExpenseClaimStatus, LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaysService } from '../leave/holidays.service';
import { listWorkingDays, toDateKey } from '../leave/working-days.util';
import { summarizeAttendance, DayAttendance } from './attendance-summary';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private holidays: HolidaysService,
  ) {}

  async attendanceReport(month: number, year: number, employeeId?: string) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const holidayDates = await this.holidays.findAllDatesInRange(monthStart, monthEnd);
    const workingDays = listWorkingDays(monthStart, monthEnd, holidayDates);

    const employees = await this.prisma.employee.findMany({
      where: { id: employeeId, status: EmployeeStatus.ACTIVE },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });

    const results = [];
    for (const employee of employees) {
      const [attendanceRecords, approvedLeaves] = await Promise.all([
        this.prisma.attendanceRecord.findMany({
          where: { employeeId: employee.id, date: { gte: monthStart, lte: monthEnd } },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            status: LeaveRequestStatus.APPROVED,
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart },
          },
        }),
      ]);

      const attendanceByDate = new Map<string, DayAttendance>(
        attendanceRecords.map((r) => [toDateKey(r.date), { status: r.status as DayAttendance['status'] }]),
      );

      const leaveByDate = new Set<string>();
      for (const leave of approvedLeaves) {
        const from = leave.startDate > monthStart ? leave.startDate : monthStart;
        const to = leave.endDate < monthEnd ? leave.endDate : monthEnd;
        const cursor = new Date(from);
        while (cursor.getTime() <= to.getTime()) {
          leaveByDate.add(toDateKey(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      results.push({
        employee,
        ...summarizeAttendance(workingDays, attendanceByDate, leaveByDate),
      });
    }

    return { month, year, workingDays: workingDays.length, employees: results };
  }

  async leaveReport(year: number, employeeId?: string) {
    const employees = await this.prisma.employee.findMany({
      where: { id: employeeId, status: EmployeeStatus.ACTIVE },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    const leaveTypes = await this.prisma.leaveType.findMany();

    const results = [];
    for (const employee of employees) {
      const [allocations, approvedRequests] = await Promise.all([
        this.prisma.leaveAllocation.findMany({ where: { employeeId: employee.id, year } }),
        this.prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            status: LeaveRequestStatus.APPROVED,
            startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
          },
        }),
      ]);

      const byLeaveType = leaveTypes.map((leaveType) => {
        const allocation = allocations.find((a) => a.leaveTypeId === leaveType.id);
        const allocated = allocation?.allocatedDays ?? leaveType.defaultAnnualDays;
        const carriedForward = allocation?.carriedForwardDays ?? 0;
        const used = approvedRequests
          .filter((r) => r.leaveTypeId === leaveType.id)
          .reduce((sum, r) => sum + r.dayCount, 0);
        return {
          leaveType: leaveType.name,
          allocated,
          carriedForward,
          used,
          balance: allocated + carriedForward - used,
        };
      });

      results.push({ employee, leaveBalances: byLeaveType });
    }

    return { year, employees: results };
  }

  async payrollRegister(payrollRunId: string) {
    const [payrollRun, payslips] = await Promise.all([
      this.prisma.payrollRun.findUniqueOrThrow({ where: { id: payrollRunId } }),
      this.prisma.payslip.findMany({
        where: { payrollRunId },
        include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      }),
    ]);

    const totals = payslips.reduce(
      (acc, p) => ({
        grossEarnings: acc.grossEarnings + p.grossEarnings,
        providentFund: acc.providentFund + p.providentFund,
        esi: acc.esi + p.esi,
        professionalTax: acc.professionalTax + p.professionalTax,
        tds: acc.tds + p.tds,
        otherDeductions: acc.otherDeductions + p.otherDeductions,
        netPay: acc.netPay + p.netPay,
      }),
      { grossEarnings: 0, providentFund: 0, esi: 0, professionalTax: 0, tds: 0, otherDeductions: 0, netPay: 0 },
    );

    return { payrollRun, payslips, totals, employeeCount: payslips.length };
  }

  async dashboard() {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const [
      headcountByStatus,
      activeEmployeeCount,
      checkedInTodayCount,
      pendingLeaveApprovals,
      pendingExpenseClaims,
      nextHoliday,
    ] = await Promise.all([
      this.prisma.employee.groupBy({ by: ['status'], _count: true }),
      this.prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      this.prisma.attendanceRecord.count({
        where: { date: todayStart, checkInAt: { not: null } },
      }),
      this.prisma.leaveRequest.count({ where: { status: LeaveRequestStatus.PENDING } }),
      this.prisma.expenseClaim.count({ where: { status: ExpenseClaimStatus.PENDING } }),
      this.prisma.holiday.findFirst({ where: { date: { gte: todayStart } }, orderBy: { date: 'asc' } }),
    ]);

    return {
      headcountByStatus: headcountByStatus.map((h) => ({ status: h.status, count: h._count })),
      activeEmployeeCount,
      todayAttendancePercent:
        activeEmployeeCount > 0 ? Math.round((checkedInTodayCount / activeEmployeeCount) * 1000) / 10 : 0,
      pendingLeaveApprovals,
      pendingExpenseClaims,
      nextHoliday,
    };
  }
}
