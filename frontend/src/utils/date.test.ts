import { describe, expect, it } from "vitest";
import { dateKey, parseDateOnly } from "./date";

describe("dateKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("pads single-digit months and days", () => {
    expect(dateKey(new Date(2026, 8, 9))).toBe("2026-09-09");
  });

  it("handles December correctly (month index 11)", () => {
    expect(dateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("parseDateOnly", () => {
  it("parses a UTC-midnight ISO string into the SAME calendar day, regardless of local timezone", () => {
    // This is the exact bug this function exists to prevent: `new Date(isoString)`
    // would shift to the previous local day in any positive-UTC-offset timezone (e.g. IST).
    const d = parseDateOnly("2026-07-21T00:00:00.000Z");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July = index 6
    expect(d.getDate()).toBe(21);
  });

  it("ignores any time-of-day component in the input", () => {
    const d = parseDateOnly("2026-03-15T18:45:00.000Z");
    expect(dateKey(d)).toBe("2026-03-15");
  });

  it("round-trips with dateKey for a plain date-only string", () => {
    const iso = "2026-11-02T00:00:00.000Z";
    expect(dateKey(parseDateOnly(iso))).toBe(iso.slice(0, 10));
  });
});
