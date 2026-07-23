import { describe, expect, it } from "vitest";
import { getNavItems, isPathAllowed } from "./navigation";
import type { Role } from "../api/types";

const ALL_ROLES: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "FINANCE", "MANAGER", "EMPLOYEE"];

describe("isPathAllowed", () => {
  it("allows every role to reach the dashboard root", () => {
    for (const role of ALL_ROLES) {
      expect(isPathAllowed(role, "/")).toBe(true);
    }
  });

  it("does not treat the root allowance as a prefix match for unrelated top-level routes", () => {
    // "/" must only match the exact root, never everything else via startsWith.
    expect(isPathAllowed("EMPLOYEE", "/administration")).toBe(false);
  });

  it("blocks EMPLOYEE from Administration (HR/Admin-only surface)", () => {
    expect(isPathAllowed("EMPLOYEE", "/administration")).toBe(false);
  });

  it("blocks EMPLOYEE from Recruitment", () => {
    expect(isPathAllowed("EMPLOYEE", "/recruitment")).toBe(false);
  });

  it("allows EMPLOYEE to reach their own payroll/payslips route", () => {
    expect(isPathAllowed("EMPLOYEE", "/payroll")).toBe(true);
  });

  it("blocks FINANCE from Employees (HR-only surface)", () => {
    expect(isPathAllowed("FINANCE", "/employees")).toBe(false);
  });

  it("allows FINANCE to reach Payroll and Reports", () => {
    expect(isPathAllowed("FINANCE", "/payroll")).toBe(true);
    expect(isPathAllowed("FINANCE", "/reports")).toBe(true);
  });

  it("blocks MANAGER from Administration and Payroll", () => {
    expect(isPathAllowed("MANAGER", "/administration")).toBe(false);
    expect(isPathAllowed("MANAGER", "/payroll")).toBe(false);
  });

  it("allows MANAGER to reach Approvals (their team's approval queue)", () => {
    expect(isPathAllowed("MANAGER", "/approvals")).toBe(true);
  });

  it("allows HR_ADMIN and SUPER_ADMIN into Administration", () => {
    expect(isPathAllowed("HR_ADMIN", "/administration")).toBe(true);
    expect(isPathAllowed("SUPER_ADMIN", "/administration")).toBe(true);
  });

  it("matches nested sub-paths via prefix (e.g. deep-linking into a route with a query-like segment)", () => {
    expect(isPathAllowed("EMPLOYEE", "/attendance/history")).toBe(true);
  });

  it("does not match a path that merely starts with the same characters but isn't a real sub-path", () => {
    // "/leave" is allowed for EMPLOYEE, but "/leaves-summary" is a different route entirely.
    expect(isPathAllowed("EMPLOYEE", "/leaves-summary")).toBe(false);
  });

  it("falls back to the EMPLOYEE allow-list for an unrecognized role value", () => {
    expect(isPathAllowed("SOMETHING_UNKNOWN" as Role, "/administration")).toBe(false);
    expect(isPathAllowed("SOMETHING_UNKNOWN" as Role, "/attendance")).toBe(true);
  });
});

describe("getNavItems", () => {
  it("gives every role a Dashboard link first", () => {
    for (const role of ALL_ROLES) {
      expect(getNavItems(role)[0].label).toBe("Dashboard");
    }
  });

  it("gives each role a genuinely different set of nav items (not the same list with items merely hidden)", () => {
    const labelSets = ALL_ROLES.map((role) => getNavItems(role).map((i) => i.label).join(","));
    expect(new Set(labelSets).size).toBe(ALL_ROLES.length);
  });

  it("every nav item's `to` path is itself allowed for that role (nav and route-guard stay in sync)", () => {
    for (const role of ALL_ROLES) {
      for (const item of getNavItems(role)) {
        expect(isPathAllowed(role, item.to)).toBe(true);
      }
    }
  });

  it("labels the Employees link as 'My Team' for MANAGER instead of 'Employees'", () => {
    const managerItems = getNavItems("MANAGER");
    expect(managerItems.some((i) => i.label === "My Team")).toBe(true);
    expect(managerItems.some((i) => i.label === "Employees")).toBe(false);
  });

  it("falls back to the EMPLOYEE nav for an unrecognized role value", () => {
    expect(getNavItems("SOMETHING_UNKNOWN" as Role)).toEqual(getNavItems("EMPLOYEE"));
  });
});
