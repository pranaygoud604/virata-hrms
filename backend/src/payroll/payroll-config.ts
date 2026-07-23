/**
 * Statutory rates used by the payroll calculator.
 *
 * These are illustrative defaults based on commonly cited India payroll rules
 * and are NOT guaranteed current — PF/ESI ceilings, PT slabs (state-specific),
 * and income tax slabs change by government notification. Before running real
 * payroll, verify every value here against the current rules for your state
 * and financial year, or replace this file's values with figures from a
 * compliance/legal source. See backend/README.md for the full caveat.
 */
export const PAYROLL_CONFIG = {
  pf: {
    employeeRatePercent: 12,
    // Statutory PF wage ceiling — contribution is calculated on min(basic, ceiling)
    // unless applyCeiling is false, in which case it is calculated on full basic.
    wageCeiling: 15000,
    applyCeiling: true,
  },
  esi: {
    employeeRatePercent: 0.75,
    // ESI applies only when gross monthly wages are at or below this threshold.
    grossWageThreshold: 21000,
  },
  // Telangana professional tax slabs (monthly), as an illustrative example —
  // swap for the correct state's slabs before going live elsewhere.
  professionalTax: {
    slabs: [
      { uptoGross: 15000, amount: 0 },
      { uptoGross: 20000, amount: 150 },
      { uptoGross: Infinity, amount: 200 },
    ],
  },
  // Deliberately simplified TDS estimate — NOT a substitute for a real tax
  // engine. No HRA exemption, Section 80C, surcharge, or old-vs-new-regime
  // choice is modelled. It exists so payslips have a TDS line at all; treat
  // the number as indicative only until a proper tax calculation is wired in.
  tds: {
    cessPercent: 4,
    standardDeduction: 75000,
    slabs: [
      { uptoAnnualIncome: 400000, ratePercent: 0 },
      { uptoAnnualIncome: 800000, ratePercent: 5 },
      { uptoAnnualIncome: 1200000, ratePercent: 10 },
      { uptoAnnualIncome: 1600000, ratePercent: 15 },
      { uptoAnnualIncome: 2000000, ratePercent: 20 },
      { uptoAnnualIncome: 2400000, ratePercent: 25 },
      { uptoAnnualIncome: Infinity, ratePercent: 30 },
    ],
  },
  overtime: {
    multiplier: 2,
  },
};
