/**
 * Counts working days (inclusive), excluding Saturdays, Sundays, and any
 * configured holiday date. This is the v1 rule — it does not yet account
 * for per-employee weekly-off patterns other than Sat/Sun (see README).
 */
export function countWorkingDays(startDate: Date, endDate: Date, holidayDates: Date[]): number {
  const holidayKeys = new Set(holidayDates.map((d) => toDateKey(d)));
  let count = 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    if (!isWeekend && !holidayKeys.has(toDateKey(cursor))) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Same rule as countWorkingDays, but returns the actual dates instead of a count. */
export function listWorkingDays(startDate: Date, endDate: Date, holidayDates: Date[]): Date[] {
  const holidayKeys = new Set(holidayDates.map((d) => toDateKey(d)));
  const days: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    if (!isWeekend && !holidayKeys.has(toDateKey(cursor))) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
