import { countWorkingDays } from './working-days.util';

describe('countWorkingDays', () => {
  it('counts a single weekday as 1', () => {
    // Monday 2026-07-20
    expect(countWorkingDays(new Date('2026-07-20'), new Date('2026-07-20'), [])).toBe(1);
  });

  it('excludes weekends from a range spanning a weekend', () => {
    // Friday 2026-07-17 through Monday 2026-07-20 => Fri, Mon = 2 working days
    expect(countWorkingDays(new Date('2026-07-17'), new Date('2026-07-20'), [])).toBe(2);
  });

  it('excludes configured holidays that fall on a weekday', () => {
    // Mon 2026-07-20 to Wed 2026-07-22, with Tue as a holiday => 2 working days
    expect(
      countWorkingDays(new Date('2026-07-20'), new Date('2026-07-22'), [new Date('2026-07-21')]),
    ).toBe(2);
  });

  it('returns 0 for a weekend-only range', () => {
    // Saturday 2026-07-18 to Sunday 2026-07-19
    expect(countWorkingDays(new Date('2026-07-18'), new Date('2026-07-19'), [])).toBe(0);
  });
});
