import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePersonalData } from "../hooks/usePersonalData";
import { dateKey } from "../utils/date";
import { formatMoney, initials } from "../utils/format";
import { SkeletonCard } from "../components/Skeleton";
import ErrorState from "../components/ErrorState";
import type { Employee, ExpenseClaim, LeaveRequest } from "../api/types";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { attendance, balances } = usePersonalData();

  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data });
  const pendingLeave = useQuery({ queryKey: ["leave-requests", "pending-approvals"], queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/pending-approvals")).data });
  const pendingExpenses = useQuery({ queryKey: ["expenses", "pending-approvals"], queryFn: async () => (await api.get<ExpenseClaim[]>("/expenses/pending-approvals")).data });

  const myTeam = useMemo(() => (employees.data ?? []).filter((e) => e.managerId === user?.employeeId), [employees.data, user?.employeeId]);
  const today = attendance.data?.find((r) => r.date.slice(0, 10) === dateKey(new Date()));
  const totalLeaveBalance = balances.data?.reduce((s, b) => s + b.balance, 0) ?? 0;
  const pendingCount = (pendingLeave.data?.length ?? 0) + (pendingExpenses.data?.length ?? 0);
  const hasError = employees.isError || pendingLeave.isError || pendingExpenses.isError || attendance.isError || balances.isError;

  return (
    <div>
      {hasError && (
        <ErrorState
          message="Some of your dashboard data couldn't load."
          onRetry={() => { employees.refetch(); pendingLeave.refetch(); pendingExpenses.refetch(); attendance.refetch(); balances.refetch(); }}
        />
      )}
      <div className="mb-8">
        <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Manager workspace</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">Your team, at a glance</h1>
        <p className="text-sm text-ink-500 mt-2">
          {myTeam.length} direct report{myTeam.length !== 1 ? "s" : ""} · {pendingCount} approval{pendingCount !== 1 ? "s" : ""} waiting on you
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">My team</h2>
          {employees.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!employees.isLoading && myTeam.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">No one reports to you yet.</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myTeam.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center gap-3">
                <span className="h-10 w-10 rounded-full bg-accent-soft text-accent flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials(m.firstName, m.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 truncate">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-ink-500 truncate">{m.designation?.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">You, today</p>
          <p className="text-lg font-semibold text-ink-900 mb-1">{today?.checkInAt ? (today?.checkOutAt ? "Checked out" : "Checked in") : "Not checked in"}</p>
          <p className="text-sm text-ink-500 mb-4">{totalLeaveBalance} leave days available</p>
          <Link to="/attendance" className="text-sm font-semibold text-accent hover:underline">Go to attendance →</Link>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-ink-900 mb-3">Needs your approval</h2>
      {pendingCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">Nothing pending — you&apos;re all caught up.</div>
      ) : (
        <div className="space-y-2">
          {pendingLeave.data?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{r.employee?.firstName} {r.employee?.lastName} · {r.leaveType?.name}</p>
                <p className="text-xs text-ink-500">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}</p>
              </div>
              <Link to="/leave" className="shrink-0 text-xs font-semibold text-accent hover:underline">Review in Leave →</Link>
            </div>
          ))}
          {pendingExpenses.data?.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{c.employee?.firstName} {c.employee?.lastName} · {c.category}</p>
                <p className="text-xs text-ink-500">{formatMoney(c.amount)}</p>
              </div>
              <Link to="/expenses" className="shrink-0 text-xs font-semibold text-accent hover:underline">Review in Expenses →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
