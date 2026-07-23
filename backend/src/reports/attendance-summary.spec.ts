import { summarizeAttendance } from './attendance-summary';

describe('summarizeAttendance', () => {
  const workingDays = [new Date('2026-07-20'), new Date('2026-07-21'), new Date('2026-07-22'), new Date('2026-07-23')];

  it('buckets present, late, half-day, on-leave, and unrecorded-absent correctly', () => {
    const attendance = new Map([
      ['2026-07-20', { status: 'PRESENT' as const }],
      ['2026-07-21', { status: 'LATE' as const }],
      ['2026-07-22', { status: 'HALF_DAY' as const }],
      // 2026-07-23 has no attendance record at all
    ]);
    const leave = new Set(['2026-07-23']);

    expect(summarizeAttendance(workingDays, attendance, leave)).toEqual({
      workingDays: 4,
      presentDays: 1,
      lateDays: 1,
      halfDays: 1,
      onLeaveDays: 1,
      unrecordedAbsentDays: 0,
    });
  });

  it('counts a day as unrecorded-absent when neither attendance nor leave cover it', () => {
    const result = summarizeAttendance(workingDays, new Map(), new Set());
    expect(result.unrecordedAbsentDays).toBe(4);
  });

  it('lets an actual attendance record take precedence over an overlapping leave request', () => {
    const attendance = new Map([['2026-07-20', { status: 'PRESENT' as const }]]);
    const leave = new Set(['2026-07-20']);
    const result = summarizeAttendance(workingDays, attendance, leave);
    expect(result.presentDays).toBe(1);
    expect(result.onLeaveDays).toBe(0);
  });
});
