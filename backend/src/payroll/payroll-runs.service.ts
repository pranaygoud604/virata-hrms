import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdHocPayType,
  Employee,
  EmployeeStatus,
  LeaveRequestStatus,
  PayrollRunStatus,
  Shift,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaysService } from '../leave/holidays.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SalaryStructuresService } from './salary-structures.service';
import { listWorkingDays, toDateKey } from '../leave/working-days.util';
import {
  calculatePF,
  calculateESI,
  calculateProfessionalTax,
  calculateMonthlyTDS,
  calculateOvertimePay,
  capTdsToAvailableGross,
  computePaidDays,
  AttendanceDayInfo,
} from './payroll-calculator';
import { ProcessPayrollRunDto } from './dto/process-payroll-run.dto';

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function shiftHoursFor(shift: { startTime: string; endTime: string } | null): number {
  if (!shift) return 0;
  let start = parseHHMM(shift.startTime);
  let end = parseHHMM(shift.endTime);
  if (end <= start) end += 24 * 60; // overnight shift
  return (end - start) / 60;
}

@Injectable()
export class PayrollRunsService {
  constructor(
    private prisma: PrismaService,
    private holidays: HolidaysService,
    private salaryStructures: SalaryStructuresService,
    private notifications: NotificationsService,
  ) {}

  async process(dto: ProcessPayrollRunDto) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: { month_year: { month: dto.month, year: dto.year } },
    });
    if (existing?.status === PayrollRunStatus.PROCESSED || existing?.status === PayrollRunStatus.PAID) {
      throw new BadRequestException(`Payroll for ${dto.month}/${dto.year} has already been processed`);
    }

    const monthStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const monthEnd = new Date(Date.UTC(dto.year, dto.month, 0));
    const holidayDates = await this.holidays.findAllDatesInRange(monthStart, monthEnd);
    const workingDays = listWorkingDays(monthStart, monthEnd, holidayDates);

    const payrollRun = existing
      ? existing
      : await this.prisma.payrollRun.create({ data: { month: dto.month, year: dto.year } });

    const employees = await this.prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      include: { shift: true },
    });

    const payslips = [];
    for (const employee of employees) {
      const salaryStructure = await this.salaryStructures.currentFor(employee.id, monthEnd);
      if (!salaryStructure) continue; // no structure yet — cannot payroll this employee

      const payslip = await this.processOneEmployee({
        employee,
        salaryStructure,
        payrollRunId: payrollRun.id,
        monthStart,
        monthEnd,
        workingDays,
      });
      payslips.push(payslip);
    }

    await this.prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: { status: PayrollRunStatus.PROCESSED, processedAt: new Date() },
    });

    return { payrollRun, payslipCount: payslips.length };
  }

  private async processOneEmployee(args: {
    employee: Employee & { shift: Shift | null };
    salaryStructure: { basic: number; hra: number; specialAllowance: number };
    payrollRunId: string;
    monthStart: Date;
    monthEnd: Date;
    workingDays: Date[];
  }) {
    const { employee, salaryStructure, payrollRunId, monthStart, monthEnd, workingDays } = args;

    const [attendanceRecords, paidLeaveRequests, pendingAdHoc] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { employeeId: employee.id, date: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          status: LeaveRequestStatus.APPROVED,
          leaveType: { isPaid: true },
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
        },
      }),
      this.prisma.adHocPayComponent.findMany({ where: { employeeId: employee.id, applied: false } }),
    ]);

    const attendanceByDate = new Map<string, AttendanceDayInfo>(
      attendanceRecords.map((r) => [toDateKey(r.date), { status: r.status as AttendanceDayInfo['status'] }]),
    );

    const paidLeaveByDate = new Map<string, number>();
    for (const request of paidLeaveRequests) {
      const from = request.startDate > monthStart ? request.startDate : monthStart;
      const to = request.endDate < monthEnd ? request.endDate : monthEnd;
      const cursor = new Date(from);
      while (cursor.getTime() <= to.getTime()) {
        paidLeaveByDate.set(toDateKey(cursor), request.isHalfDay ? 0.5 : 1);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const paidDays = computePaidDays(workingDays, attendanceByDate, paidLeaveByDate);
    const proratedFactor = workingDays.length > 0 ? paidDays / workingDays.length : 0;

    const { basic, hra, specialAllowance } = salaryStructure;
    const monthlyGrossFull = basic + hra + specialAllowance;
    const proratedBasic = basic * proratedFactor;
    const proratedGross = monthlyGrossFull * proratedFactor;

    const shiftHours = shiftHoursFor(employee.shift);
    let overtimeMinutes = 0;
    for (const record of attendanceRecords) {
      if (record.checkInAt && record.checkOutAt) {
        const workedMinutes = (record.checkOutAt.getTime() - record.checkInAt.getTime()) / 60000;
        const shiftMinutes = shiftHours * 60;
        overtimeMinutes += Math.max(0, workedMinutes - shiftMinutes);
      }
    }
    const overtimePay = calculateOvertimePay(basic, workingDays.length, shiftHours, overtimeMinutes / 60);

    const bonusIncentive = pendingAdHoc
      .filter((c) => c.type === AdHocPayType.BONUS || c.type === AdHocPayType.INCENTIVE)
      .reduce((sum, c) => sum + c.amount, 0);
    const otherDeductions = pendingAdHoc
      .filter((c) => c.type === AdHocPayType.DEDUCTION || c.type === AdHocPayType.LOAN_EMI)
      .reduce((sum, c) => sum + c.amount, 0);

    const grossEarnings = proratedGross + overtimePay + bonusIncentive;
    const pf = calculatePF(proratedBasic);
    const esi = calculateESI(proratedGross);
    const professionalTax = calculateProfessionalTax(proratedGross);
    // TDS is estimated off the full contracted monthly gross (annualized), not the
    // prorated month, so a single light month doesn't cause a misleading TDS swing —
    // but it's capped so a low-attendance month never withholds more tax than is
    // actually being paid out (e.g. zero paid days this month => zero TDS, not a
    // negative payslip).
    const tds = capTdsToAvailableGross(calculateMonthlyTDS(monthlyGrossFull), grossEarnings, pf + esi + professionalTax);
    // Final safety floor — a payslip must never show negative pay. If ad-hoc
    // deductions/loan EMIs exceed what's earned this cycle, that shortfall needs a
    // carry-forward/adjustment mechanism, which is out of scope for now.
    const netPay = Math.max(0, grossEarnings - pf - esi - professionalTax - tds - otherDeductions);

    const payslip = await this.prisma.payslip.upsert({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId: employee.id } },
      create: {
        payrollRunId,
        employeeId: employee.id,
        basic,
        hra,
        specialAllowance,
        overtimePay,
        bonusIncentive,
        grossEarnings,
        providentFund: pf,
        esi,
        professionalTax,
        tds,
        otherDeductions,
        netPay,
        workingDays: workingDays.length,
        paidDays,
      },
      update: {
        basic,
        hra,
        specialAllowance,
        overtimePay,
        bonusIncentive,
        grossEarnings,
        providentFund: pf,
        esi,
        professionalTax,
        tds,
        otherDeductions,
        netPay,
        workingDays: workingDays.length,
        paidDays,
      },
    });

    if (pendingAdHoc.length > 0) {
      await this.prisma.adHocPayComponent.updateMany({
        where: { id: { in: pendingAdHoc.map((c) => c.id) } },
        data: { applied: true, payrollRunId },
      });
    }

    await this.notifySalaryCredited(employee.id, netPay);
    return payslip;
  }

  private async notifySalaryCredited(employeeId: string, netPay: number) {
    const user = await this.prisma.user.findUnique({ where: { employeeId } });
    if (!user) return;
    await this.notifications.notify({
      userId: user.id,
      title: 'Payslip generated',
      message: `Your payslip is ready — net pay ₹${netPay.toFixed(2)}.`,
    });
  }

  async findPayslip(payrollRunId: string, employeeId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');
    return payslip;
  }

  payslipsForEmployee(employeeId: string) {
    return this.prisma.payslip.findMany({
      where: { employeeId },
      include: { payrollRun: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async bankFileCsv(payrollRunId: string): Promise<string> {
    const payslips = await this.prisma.payslip.findMany({
      where: { payrollRunId },
      include: { employee: { include: { bankDetail: true } } },
    });

    const header = 'EmployeeCode,Name,AccountNumber,IFSC,BankName,NetPay';
    const rows = payslips.map((p) => {
      const bank = p.employee.bankDetail;
      const name = `${p.employee.firstName} ${p.employee.lastName}`;
      if (!bank) {
        return `${p.employee.employeeCode},${name},MISSING_BANK_DETAILS,,,${p.netPay.toFixed(2)}`;
      }
      return `${p.employee.employeeCode},${name},${bank.accountNumber},${bank.ifscCode},${bank.bankName},${p.netPay.toFixed(2)}`;
    });

    return [header, ...rows].join('\n');
  }
}
