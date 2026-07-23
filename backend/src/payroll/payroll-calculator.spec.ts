import {
  calculatePF,
  calculateESI,
  calculateProfessionalTax,
  calculateMonthlyTDS,
  calculateOvertimePay,
  capTdsToAvailableGross,
  computePaidDays,
} from './payroll-calculator';

describe('payroll-calculator', () => {
  describe('calculatePF', () => {
    it('applies the wage ceiling when basic exceeds it', () => {
      // 12% of the ₹15,000 ceiling, not of the full ₹40,000 basic.
      expect(calculatePF(40000)).toBeCloseTo(1800, 2);
    });

    it('calculates 12% of basic when below the ceiling', () => {
      expect(calculatePF(10000)).toBeCloseTo(1200, 2);
    });
  });

  describe('calculateESI', () => {
    it('is 0.75% of gross when at or below the threshold', () => {
      expect(calculateESI(18000)).toBeCloseTo(135, 2);
    });

    it('is zero above the ESI wage threshold', () => {
      expect(calculateESI(25000)).toBe(0);
    });
  });

  describe('calculateProfessionalTax', () => {
    it('is nil under ₹15,000', () => {
      expect(calculateProfessionalTax(12000)).toBe(0);
    });

    it('is ₹150 between ₹15,001 and ₹20,000', () => {
      expect(calculateProfessionalTax(18000)).toBe(150);
    });

    it('is ₹200 above ₹20,000', () => {
      expect(calculateProfessionalTax(50000)).toBe(200);
    });
  });

  describe('calculateMonthlyTDS', () => {
    it('is zero for income fully covered by the standard deduction and nil slab', () => {
      // ₹30,000/mo => ₹3.6L/yr, minus ₹75k standard deduction => well under the nil slab.
      expect(calculateMonthlyTDS(30000)).toBe(0);
    });

    it('is positive once annual taxable income clears the nil slab', () => {
      // ₹1,00,000/mo => ₹12L/yr, minus 75k deduction => taxed across multiple slabs.
      expect(calculateMonthlyTDS(100000)).toBeGreaterThan(0);
    });

    it('increases as gross income increases', () => {
      const lower = calculateMonthlyTDS(80000);
      const higher = calculateMonthlyTDS(200000);
      expect(higher).toBeGreaterThan(lower);
    });
  });

  describe('calculateOvertimePay', () => {
    it('pays double the effective hourly rate for overtime hours', () => {
      // basic 22000 / (22 days * 8 hrs) = 125/hr effective rate; 4 OT hours * 2x = 1000
      expect(calculateOvertimePay(22000, 22, 8, 4)).toBeCloseTo(1000, 2);
    });

    it('is zero when there are no overtime hours', () => {
      expect(calculateOvertimePay(22000, 22, 8, 0)).toBe(0);
    });
  });

  describe('capTdsToAvailableGross', () => {
    // Regression test: found live when an employee with zero paid days in the
    // month still got charged full annualized TDS, producing a negative payslip
    // that then flowed into the bank-transfer export.
    it('caps TDS to zero when gross earnings for the period are zero', () => {
      expect(capTdsToAvailableGross(4550, 0, 0)).toBe(0);
    });

    it('caps TDS to what remains after other statutory deductions', () => {
      // Only ₹200 left after PF/ESI/PT — TDS cannot take more than that.
      expect(capTdsToAvailableGross(4550, 1000, 800)).toBe(200);
    });

    it('leaves TDS unchanged when there is enough gross to cover it', () => {
      expect(capTdsToAvailableGross(4550, 100000, 5000)).toBe(4550);
    });
  });

  describe('computePaidDays', () => {
    const workingDays = [new Date('2026-07-20'), new Date('2026-07-21'), new Date('2026-07-22')];

    it('counts present and late days as full paid days', () => {
      const attendance = new Map([
        ['2026-07-20', { status: 'PRESENT' as const }],
        ['2026-07-21', { status: 'LATE' as const }],
      ]);
      expect(computePaidDays(workingDays, attendance, new Map())).toBe(2);
    });

    it('counts a half-day attendance as 0.5', () => {
      const attendance = new Map([['2026-07-20', { status: 'HALF_DAY' as const }]]);
      expect(computePaidDays(workingDays, attendance, new Map())).toBe(0.5);
    });

    it('counts approved paid leave days when there is no attendance record', () => {
      const paidLeave = new Map([
        ['2026-07-21', 1],
        ['2026-07-22', 0.5],
      ]);
      expect(computePaidDays(workingDays, new Map(), paidLeave)).toBe(1.5);
    });

    it('does not pay for a day with neither attendance nor covering paid leave', () => {
      expect(computePaidDays(workingDays, new Map(), new Map())).toBe(0);
    });
  });
});
