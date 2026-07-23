import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Briefcase, CalendarHeart, Receipt, Users2 } from "lucide-react";
import { api } from "../api/client";
import { usePersonalData } from "../hooks/usePersonalData";
import { buildActivity } from "../utils/buildActivity";
import { useDashboardLayout, type WidgetDef } from "../hooks/useDashboardLayout";
import DashboardCustomizer from "../components/DashboardCustomizer";
import RadialProgress from "../components/RadialProgress";
import Timeline from "../components/Timeline";
import Skeleton from "../components/Skeleton";
import ErrorState from "../components/ErrorState";
import type { DashboardStats, JobPosting } from "../api/types";

const WIDGETS: WidgetDef[] = [
  { id: "hiring", label: "Hiring snapshot" },
  { id: "activity", label: "Recent activity" },
  { id: "holiday", label: "Next holiday" },
  { id: "quickActions", label: "Quick actions" },
];

function KpiTile({ label, value, sub, loading }: { label: string; value: string | number; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
      <p className="text-xs text-ink-500 uppercase tracking-wide">{label}</p>
      {loading ? <Skeleton className="h-8 w-16 mt-1.5" /> : <p className="font-display text-3xl font-semibold text-ink-900 tabular-nums mt-1">{value}</p>}
      {sub && !loading && <p className="text-xs text-ink-300 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const orgStats = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await api.get<DashboardStats>("/reports/dashboard")).data });
  const openPostings = useQuery({ queryKey: ["job-postings"], queryFn: async () => (await api.get<JobPosting[]>("/job-postings?status=OPEN")).data });
  const { attendance, leaveRequests, expenses } = usePersonalData();
  const layout = useDashboardLayout("super-admin", WIDGETS);

  const activity = useMemo(() => buildActivity(attendance.data, leaveRequests.data, expenses.data), [attendance.data, leaveRequests.data, expenses.data]);
  const totalCandidates = openPostings.data?.reduce((s, p) => s + (p._count?.candidates ?? 0), 0) ?? 0;
  const hasError = orgStats.isError || openPostings.isError;

  const widgetContent: Record<string, { span: string; node: ReactNode }> = {
    hiring: {
      span: "lg:col-span-2",
      node: (
        <div className="rounded-3xl border border-line bg-surface-1 shadow-card p-7 flex items-center gap-8">
          <RadialProgress percent={orgStats.data?.todayAttendancePercent ?? 0} label="org present" />
          <div>
            <p className="text-xs text-ink-500 uppercase tracking-wide mb-1">Hiring</p>
            <p className="font-display text-2xl font-semibold text-ink-900">{openPostings.data?.length ?? 0} open role{openPostings.data?.length !== 1 ? "s" : ""}</p>
            <p className="text-sm text-ink-500 mb-3">{totalCandidates} candidates in the pipeline</p>
            <div className="flex gap-4">
              <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"><Users2 size={14} strokeWidth={2} /> Employees</Link>
              <Link to="/recruitment" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"><Briefcase size={14} strokeWidth={2} /> Recruitment</Link>
            </div>
          </div>
        </div>
      ),
    },
    activity: {
      span: "lg:col-span-2",
      node: (
        <div>
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Recent activity (yours)</h2>
          <Timeline items={activity} />
        </div>
      ),
    },
    holiday: {
      span: "lg:col-span-1",
      node: orgStats.data?.nextHoliday ? (
        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><CalendarHeart size={12} strokeWidth={1.75} /> Next holiday</p>
          <p className="font-display text-lg font-semibold text-ink-900">{orgStats.data.nextHoliday.name}</p>
          <p className="text-sm text-ink-500">{new Date(orgStats.data.nextHoliday.date).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      ) : null,
    },
    quickActions: {
      span: "lg:col-span-1",
      node: (
        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">Quick actions</p>
          <div className="space-y-1">
            <Link to="/employees" className="flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 py-1.5"><Users2 size={14} strokeWidth={1.75} /> Add an employee</Link>
            <Link to="/recruitment" className="flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 py-1.5"><Briefcase size={14} strokeWidth={1.75} /> Post a job</Link>
            <Link to="/expenses" className="flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 py-1.5"><Receipt size={14} strokeWidth={1.75} /> Review expenses</Link>
          </div>
        </div>
      ),
    },
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Company overview</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Virata Interior</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</p>
          <DashboardCustomizer widgets={WIDGETS} order={layout.order} hidden={layout.hidden} toggleHidden={layout.toggleHidden} move={layout.move} reset={layout.reset} />
        </div>
      </div>

      {hasError && (
        <ErrorState
          message="Some of your dashboard data couldn't load."
          onRetry={() => { orgStats.refetch(); openPostings.refetch(); }}
        />
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiTile label="Active employees" value={orgStats.data?.activeEmployeeCount ?? "—"} loading={orgStats.isLoading} />
        <KpiTile label="Present today" value={`${orgStats.data?.todayAttendancePercent ?? 0}%`} loading={orgStats.isLoading} />
        <KpiTile label="Pending leave" value={orgStats.data?.pendingLeaveApprovals ?? 0} sub="awaiting approval" loading={orgStats.isLoading} />
        <KpiTile label="Pending expenses" value={orgStats.data?.pendingExpenseClaims ?? 0} sub="awaiting approval" loading={orgStats.isLoading} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {layout.visibleOrder.map((id) => {
          const widget = widgetContent[id];
          if (!widget?.node) return null;
          return <div key={id} className={widget.span}>{widget.node}</div>;
        })}
      </div>
    </div>
  );
}
