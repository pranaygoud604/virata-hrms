import { PAYROLL_CONFIG } from './payroll-config';
import { toDateKey } from '../leave/working-days.util';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function progressiveTax(taxableIncome: number, slabs: { uptoAnnualIncome: number; ratePercent: number }[]): number {
  let tax = 0;
  let previousThreshold = 0;
  for (const slab of slabs) {
    if (taxableIncome <= previousThreshold) break;
    const upper = Math.min(taxableIncome, slab.uptoAnnualIncome);
    const amountInSlab = upper - previousThreshold;
    tax += amountInSlab * (slab.ratePercent / 100);
    previousThreshold = slab.uptoAnnualIncome;
  }
  return tax;
}

export function calculatePF(basic: number): number {
  const { applyCeiling, wageCeiling, employeeRatePercent } = PAYROLL_CONFIG.pf;
  const base = applyCeiling ? Math.min(basic, wageCeiling) : basic;
  return round2(base * (employeeRatePercent / 100));
}

export function calculateESI(grossMonthly: number): number {
  const { grossWageThreshold, employeeRatePercent } = PAYROLL_CONFIG.esi;
  if (grossMonthly > grossWageThreshold) return 0;
  return round2(grossMonthly * (employeeRatePercent / 100));
}

export function calculateProfessionalTax(grossMonthly: number): number {
  const slab = PAYROLL_CONFIG.professionalTax.slabs.find((s) => grossMonthly <= s.uptoGross);
  return slab?.amount ?? 0;
}

export function calculateMonthlyTDS(monthlyGross: number): number {
  const { standardDeduction, slabs, cessPercent } = PAYROLL_CONFIG.tds;
  const annualIncome = monthlyGross * 12;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);
  const tax = progressiveTax(taxableIncome, slabs);
  const withCess = tax * (1 + cessPercent / 100);
  return round2(withCess / 12);
}

export function calculateOvertimePay(
  basic: number,
  workingDaysInMonth: number,
  shiftHoursPerDay: number,
  overtimeHours: number,
): number {
  if (workingDaysInMonth <= 0 || shiftHoursPerDay <= 0 || overtimeHours <= 0) return 0;
  const perHourRate = basic / (workingDaysInMonth * shiftHoursPerDay);
  return round2(perHourRate * overtimeHours * PAYROLL_CONFIG.overtime.multiplier);
}

/**
 * TDS is estimated off the full annualized contracted salary (see
 * calculateMonthlyTDS), independent of this month's actual attendance — that's
 * deliberate, so one light month doesn't cause a misleading TDS swing. But it
 * must never withhold more than is actually being paid out this cycle (e.g. an
 * employee with zero paid days this month has zero income to withhold tax
 * from). Caps the estimated TDS to what's left of gross earnings after the
 * other statutory deductions.
 */
export function capTdsToAvailableGross(
  estimatedTds: number,
  grossEarnings: number,
  otherStatutoryDeductions: number,
): number {
  const available = Math.max(0, grossEarnings - otherStatutoryDeductions);
  return Math.min(estimatedTds, available);
}

export interface AttendanceDayInfo {
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE';
}

/**
 * Paid days for the month = every working day the employee was present/late
 * (full day), half-day-marked (0.5), or on approved *paid* leave (1, or 0.5
 * for a half-day leave). Everything else (no attendance record, no covering
 * paid leave) is an unpaid absence.
 */
export function computePaidDays(
  workingDays: Date[],
  attendanceByDate: Map<string, AttendanceDayInfo>,
  paidLeaveByDate: Map<string, number>,
): number {
  let paidDays = 0;
  for (const day of workingDays) {
    const key = toDateKey(day);
    const attendance = attendanceByDate.get(key);
    if (attendance?.status === 'PRESENT' || attendance?.status === 'LATE') {
      paidDays += 1;
    } else if (attendance?.status === 'HALF_DAY') {
      paidDays += 0.5;
    } else if (paidLeaveByDate.has(key)) {
      paidDays += paidLeaveByDate.get(key) as number;
    }
    // else: unpaid absence, contributes 0
  }
  return paidDays;
}
