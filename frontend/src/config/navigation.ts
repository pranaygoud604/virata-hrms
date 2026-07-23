import {
  LayoutDashboard, Users, Fingerprint, CalendarDays, Receipt, Wallet,
  CalendarClock, Briefcase, Award, BarChart3, Settings, Network, CheckSquare, Calendar as CalendarIcon,
} from "lucide-react";
import type { Role } from "../api/types";

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: typeof Users;
}

const DASHBOARD: NavItem = { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard };
const EMPLOYEES: NavItem = { to: "/employees", label: "Employees", icon: Users };
const MY_TEAM: NavItem = { to: "/employees", label: "My Team", icon: Users };
const ATTENDANCE: NavItem = { to: "/attendance", label: "Attendance", icon: Fingerprint };
const LEAVE: NavItem = { to: "/leave", label: "Leave", icon: CalendarDays };
const EXPENSES: NavItem = { to: "/expenses", label: "Expenses", icon: Receipt };
const PAYROLL: NavItem = { to: "/payroll", label: "Payroll", icon: Wallet };
const SHIFTS: NavItem = { to: "/shifts-holidays", label: "Shifts & Holidays", icon: CalendarClock };
const RECRUITMENT: NavItem = { to: "/recruitment", label: "Recruitment", icon: Briefcase };
const PERFORMANCE: NavItem = { to: "/performance", label: "Performance", icon: Award };
const REPORTS: NavItem = { to: "/reports", label: "Reports", icon: BarChart3 };
const ADMINISTRATION: NavItem = { to: "/administration", label: "Administration", icon: Settings };
const ORG_CHART: NavItem = { to: "/organization-chart", label: "Org Chart", icon: Network };
const APPROVALS: NavItem = { to: "/approvals", label: "Approvals", icon: CheckSquare };
const CALENDAR: NavItem = { to: "/calendar", label: "Calendar", icon: CalendarIcon };

/**
 * Every role's nav is deliberately a different set/order, not the same 8
 * icons with some hidden — that was the actual architectural bug. Only
 * pages that genuinely exist are listed; modules like Company Settings or
 * Audit Logs aren't linked because they haven't been built, not because
 * they were hidden for this role.
 */
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [DASHBOARD, EMPLOYEES, ORG_CHART, ATTENDANCE, LEAVE, APPROVALS, PAYROLL, RECRUITMENT, PERFORMANCE, REPORTS, EXPENSES, SHIFTS, CALENDAR, ADMINISTRATION],
  HR_ADMIN: [DASHBOARD, EMPLOYEES, ORG_CHART, RECRUITMENT, ATTENDANCE, LEAVE, APPROVALS, EXPENSES, PAYROLL, PERFORMANCE, REPORTS, SHIFTS, CALENDAR, ADMINISTRATION],
  FINANCE: [DASHBOARD, PAYROLL, EXPENSES, ATTENDANCE, REPORTS, CALENDAR],
  MANAGER: [DASHBOARD, MY_TEAM, ORG_CHART, ATTENDANCE, LEAVE, APPROVALS, PERFORMANCE, EXPENSES, REPORTS, CALENDAR],
  EMPLOYEE: [DASHBOARD, ATTENDANCE, LEAVE, PAYROLL, PERFORMANCE, EXPENSES, CALENDAR],
};

/** Path prefixes each role is allowed to reach — used by the route guard, not just nav display. */
const ALLOWED_PATHS_BY_ROLE: Record<Role, string[]> = {
  SUPER_ADMIN: ["/", "/employees", "/organization-chart", "/attendance", "/leave", "/approvals", "/payroll", "/recruitment", "/performance", "/reports", "/expenses", "/shifts-holidays", "/calendar", "/administration", "/notifications", "/profile"],
  HR_ADMIN: ["/", "/employees", "/organization-chart", "/recruitment", "/attendance", "/leave", "/approvals", "/expenses", "/payroll", "/performance", "/reports", "/shifts-holidays", "/calendar", "/administration", "/notifications", "/profile"],
  FINANCE: ["/", "/payroll", "/expenses", "/attendance", "/reports", "/calendar", "/notifications", "/profile"],
  MANAGER: ["/", "/employees", "/organization-chart", "/attendance", "/leave", "/approvals", "/performance", "/expenses", "/reports", "/calendar", "/notifications", "/profile"],
  EMPLOYEE: ["/", "/attendance", "/leave", "/payroll", "/performance", "/expenses", "/calendar", "/notifications", "/profile"],
};

export function getNavItems(role: Role): NavItem[] {
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.EMPLOYEE;
}

export function isPathAllowed(role: Role, pathname: string): boolean {
  const allowed = ALLOWED_PATHS_BY_ROLE[role] ?? ALLOWED_PATHS_BY_ROLE.EMPLOYEE;
  return allowed.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}
