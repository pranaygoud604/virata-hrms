/**
 * Calendar-day key using LOCAL date components only — never routes through
 * toISOString()/UTC. A calendar day is a local concept; converting to UTC
 * and back shifts the date by one whenever the local timezone has a
 * positive offset (e.g. IST) and the time component is midnight, since
 * local midnight is earlier in UTC terms and lands on the previous day.
 */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses a date-only API field (e.g. "2026-07-21T00:00:00.000Z") into a LOCAL
 * Date representing that exact calendar day — never `new Date(isoString)`,
 * which interprets the "Z" as UTC and can land on the wrong local day.
 */
export function parseDateOnly(isoString: string): Date {
  const [y, m, d] = isoString.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
