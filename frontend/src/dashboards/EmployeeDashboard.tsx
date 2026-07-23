import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Fingerprint } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { usePersonalData } from "../hooks/usePersonalData";
import { buildActivity } from "../utils/buildActivity";
import { dateKey } from "../utils/date";
import { formatMoney } from "../utils/format";
import Timeline from "../components/Timeline";
import MonthCalendar, { type DayMarker } from "../components/MonthCalendar";
import ErrorState from "../components/ErrorState";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { attendance, balances, leaveRequests, expenses, payslips, holidays } = usePersonalData();

  const today = attendance.data?.find((r) => r.date.slice(0, 10) === dateKey(new Date()));
  const totalLeaveBalance = balances.data?.reduce((s, b) => s + b.balance, 0) ?? 0;
  const latestPayslip = payslips.data?.[0];
  const activity = useMemo(() => buildActivity(attendance.data, leaveRequests.data, expenses.data), [attendance.data, leaveRequests.data, expenses.data]);

  const calendarMarkers = useMemo(() => {
    const map: Record<string, DayMarker[]> = {};
    for (const h of holidays.data ?? []) {
      const key = h.date.slice(0, 10);
      map[key] = [...(map[key] ?? []), { tone: "brass" }];
    }
    return map;
  }, [holidays.data]);

  const firstName = user?.email.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nextHoliday = holidays.data?.find((h) => new Date(h.date).getTime() >= new Date().setHours(0, 0, 0, 0));
  const hasError = attendance.isError || balances.isError || leaveRequests.isError || expenses.isError || payslips.isError || holidays.isError;

  return (
    <div>
      {hasError && (
        <ErrorState
          message="Some of your dashboard data couldn't load."
          onRetry={() => { attendance.refetch(); balances.refetch(); leaveRequests.refetch(); expenses.refetch(); payslips.refetch(); holidays.refetch(); }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl p-8 sm:p-10 mb-8"
        style={{ background: "var(--gradient-signature)" }}
      >
        <div className="absolute inset-0 bg-ink-900/10" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-2">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white mb-4 text-balance">{greeting}, {firstName}.</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/90 text-sm">
            <span>{today?.checkInAt ? (today?.checkOutAt ? "Checked out for the day" : "Checked in") : "Not checked in yet"}</span>
            <span className="opacity-50">·</span>
            <span>{totalLeaveBalance} leave days available</span>
            {latestPayslip && (
              <>
                <span className="opacity-50">·</span>
                <span>Latest payslip {formatMoney(latestPayslip.netPay)}</span>
              </>
            )}
          </div>
          <Link to="/attendance" className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-white bg-white/15 hover:bg-white/25 rounded-full px-4 py-2 transition-colors">
            <Fingerprint size={15} strokeWidth={2} /> Go to attendance
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Recent activity</h2>
          <Timeline items={activity} />
        </div>
        <div className="space-y-6">
          <MonthCalendar markers={calendarMarkers} />
          {nextHoliday && (
            <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
              <p className="text-xs text-ink-500 uppercase tracking-wide mb-1">Next holiday</p>
              <p className="font-display text-lg font-semibold text-ink-900">{nextHoliday.name}</p>
              <p className="text-sm text-ink-500">{new Date(nextHoliday.date).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
