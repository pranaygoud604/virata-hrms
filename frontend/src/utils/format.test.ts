import { describe, expect, it } from "vitest";
import { formatMoney, initials, initialsFromName } from "./format";

describe("formatMoney", () => {
  it("formats a whole number with two decimal places and the rupee sign", () => {
    expect(formatMoney(1500)).toBe("₹1,500.00");
  });

  it("formats a fractional amount using Indian digit grouping", () => {
    expect(formatMoney(123456.5)).toBe("₹1,23,456.50");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("₹0.00");
  });
});

describe("initials", () => {
  it("takes the first letter of each name and uppercases it", () => {
    expect(initials("ravi", "teja")).toBe("RT");
  });

  it("handles an empty last name gracefully", () => {
    expect(initials("Ravi", "")).toBe("R");
  });
});

describe("initialsFromName", () => {
  it("splits a full name on whitespace", () => {
    expect(initialsFromName("Ravi Teja Reddy")).toBe("RT");
  });

  it("handles a single-word name", () => {
    expect(initialsFromName("Madonna")).toBe("M");
  });

  it("handles extra whitespace between words", () => {
    expect(initialsFromName("  Ravi   Teja  ")).toBe("RT");
  });
});
