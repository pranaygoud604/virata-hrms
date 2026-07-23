import { CheckCircle2, Fingerprint, Receipt, XCircle } from "lucide-react";
import type { TimelineItem } from "../components/Timeline";
import { formatMoney } from "./format";
import type { AttendanceRecord, ExpenseClaim, LeaveRequest } from "../api/types";

/** Builds a real activity timeline from the person's own attendance/leave/expense events — no fabricated data. */
export function buildActivity(
  attendance: AttendanceRecord[] | undefined,
  leaveRequests: LeaveRequest[] | undefined,
  expenses: ExpenseClaim[] | undefined,
  limit = 7,
): TimelineItem[] {
  const items: (TimelineItem & { at: number })[] = [];

  for (const r of attendance ?? []) {
    if (r.checkOutAt) items.push({ key: `${r.id}-out`, at: new Date(r.checkOutAt).getTime(), icon: <Fingerprint size={16} strokeWidth={1.75} />, tone: "accent", title: "Checked out", meta: new Date(r.checkOutAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) });
    else if (r.checkInAt) items.push({ key: `${r.id}-in`, at: new Date(r.checkInAt).getTime(), icon: <Fingerprint size={16} strokeWidth={1.75} />, tone: "accent", title: "Checked in", meta: new Date(r.checkInAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) });
  }
  for (const l of leaveRequests ?? []) {
    if (l.status === "APPROVED" || l.status === "REJECTED") {
      items.push({
        key: `${l.id}-decision`, at: new Date(l.startDate).getTime(),
        icon: l.status === "APPROVED" ? <CheckCircle2 size={16} strokeWidth={1.75} /> : <XCircle size={16} strokeWidth={1.75} />,
        tone: l.status === "APPROVED" ? "good" : "critical",
        title: `${l.leaveType?.name ?? "Leave"} request ${l.status.toLowerCase()}`,
        meta: `${l.startDate.slice(0, 10)} → ${l.endDate.slice(0, 10)}`,
      });
    }
  }
  for (const e of expenses ?? []) {
    if (e.status === "REIMBURSED" || e.status === "REJECTED") {
      items.push({
        key: `${e.id}-decision`, at: new Date(e.expenseDate).getTime(),
        icon: <Receipt size={16} strokeWidth={1.75} />,
        tone: e.status === "REIMBURSED" ? "good" : "critical",
        title: `${e.category} claim ${e.status.toLowerCase()}`,
        meta: formatMoney(e.amount),
      });
    }
  }
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}
