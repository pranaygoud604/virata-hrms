import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarHeart, Receipt, UserPlus, Users2 } from "lucide-react";
import { api } from "../api/client";
import { formatMoney } from "../utils/format";
import ErrorState from "../components/ErrorState";
import type { DashboardStats, ExpenseClaim, JobPosting, LeaveRequest } from "../api/types";

export default function HRAdminDashboard() {
  const orgStats = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await api.get<DashboardStats>("/reports/dashboard")).data });
  const pendingLeave = useQuery({ queryKey: ["leave-requests", "pending-approvals"], queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/pending-approvals")).data });
  const pendingExpenses = useQuery({ queryKey: ["expenses", "pending-approvals"], queryFn: async () => (await api.get<ExpenseClaim[]>("/expenses/pending-approvals")).data });
  const openPostings = useQuery({ queryKey: ["job-postings"], queryFn: async () => (await api.get<JobPosting[]>("/job-postings?status=OPEN")).data });

  const totalCandidates = openPostings.data?.reduce((s, p) => s + (p._count?.candidates ?? 0), 0) ?? 0;
  const pendingCount = (pendingLeave.data?.length ?? 0) + (pendingExpenses.data?.length ?? 0);
  const hasError = orgStats.isError || pendingLeave.isError || pendingExpenses.isError || openPostings.isError;

  return (
    <div>
      {hasError && (
        <ErrorState
          message="Some of your dashboard data couldn't load."
          onRetry={() => { orgStats.refetch(); pendingLeave.refetch(); pendingExpenses.refetch(); openPostings.refetch(); }}
        />
      )}
      <div className="mb-8">
        <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">HR workspace</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">What needs you today</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div>
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Approval queue</h2>
          {pendingCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">Nothing pending.</div>
          ) : (
            <div className="space-y-2">
              {pendingLeave.data?.slice(0, 4).map((r) => (
                <Link key={r.id} to="/leave" className="flex items-center gap-3 rounded-2xl border border-line bg-surface-1 shadow-card px-4 py-3 hover:shadow-card-hover transition-shadow">
                  <span className="h-8 w-8 rounded-lg bg-status-warn-soft text-status-warn flex items-center justify-center shrink-0"><CalendarHeart size={14} strokeWidth={1.75} /></span>
                  <span className="text-sm text-ink-900 truncate">{r.employee?.firstName} {r.employee?.lastName} — {r.leaveType?.name}</span>
                </Link>
              ))}
              {pendingExpenses.data?.slice(0, 4).map((c) => (
                <Link key={c.id} to="/expenses" className="flex items-center gap-3 rounded-2xl border border-line bg-surface-1 shadow-card px-4 py-3 hover:shadow-card-hover transition-shadow">
                  <span className="h-8 w-8 rounded-lg bg-status-warn-soft text-status-warn flex items-center justify-center shrink-0"><Receipt size={14} strokeWidth={1.75} /></span>
                  <span className="text-sm text-ink-900 truncate">{c.employee?.firstName} {c.employee?.lastName} — {formatMoney(c.amount)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Hiring pipeline</h2>
          <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center"><UserPlus size={16} strokeWidth={1.75} /></span>
              <div>
                <p className="font-display text-xl font-semibold text-ink-900">{openPostings.data?.length ?? 0} open role{openPostings.data?.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-ink-500">{totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""} in the pipeline</p>
              </div>
            </div>
            <Link to="/recruitment" className="text-sm font-semibold text-accent hover:underline">Open recruitment →</Link>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-ink-900 mb-3">Workforce snapshot</h2>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5 flex items-center gap-3">
          <span className="h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0"><Users2 size={16} strokeWidth={1.75} /></span>
          <div>
            <p className="text-lg font-semibold text-ink-900 tabular-nums">{orgStats.data?.activeEmployeeCount ?? "—"}</p>
            <p className="text-[11px] text-ink-500">Active employees</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
          <p className="text-lg font-semibold text-ink-900 tabular-nums">{orgStats.data?.todayAttendancePercent ?? 0}%</p>
          <p className="text-[11px] text-ink-500">Present today</p>
        </div>
        {orgStats.data?.nextHoliday && (
          <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
            <p className="text-sm font-semibold text-ink-900 truncate">{orgStats.data.nextHoliday.name}</p>
            <p className="text-[11px] text-ink-500">Next holiday</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
