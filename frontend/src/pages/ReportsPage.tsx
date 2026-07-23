import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { downloadCsv } from "../utils/csv";
import Tabs from "../components/Tabs";
import Skeleton from "../components/Skeleton";
import ErrorState from "../components/ErrorState";
import type {
  AttendanceReport,
  DashboardStats,
  Employee,
  Goal,
  LeaveReport,
  PerformanceCycle,
  PerformanceReview,
  Payslip,
  PayrollRegister as PayrollRegisterType,
} from "../api/types";

const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
      <Download size={13} strokeWidth={2} /> Export CSV
    </button>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 text-xs text-ink-500 shrink-0">{d.label}</span>
          <div className="flex-1 h-5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
          </div>
          <span className="w-8 text-xs font-semibold text-ink-900 tabular-nums text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === "MANAGER";
  const now = new Date();

  function exportCsv(filename: string, rows: (string | number)[][]) {
    downloadCsv(filename, rows);
    toast.success(`Exported ${filename}`);
  }

  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attEmployeeId, setAttEmployeeId] = useState("");
  const [leaveYear, setLeaveYear] = useState(now.getFullYear());
  const [leaveEmployeeId, setLeaveEmployeeId] = useState("");
  const [payrollRunId, setPayrollRunId] = useState("");
  const [perfCycleId, setPerfCycleId] = useState("");

  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data });
  const scopedEmployees = useMemo(
    () => (isManager ? (employees.data ?? []).filter((e) => e.managerId === user?.employeeId) : employees.data ?? []),
    [employees.data, isManager, user?.employeeId],
  );

  const departmentCounts = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>();
    for (const e of employees.data ?? []) {
      const key = e.department?.name ?? "Unassigned";
      const entry = map.get(key) ?? { active: 0, total: 0 };
      entry.total += 1;
      if (e.status === "ACTIVE") entry.active += 1;
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [employees.data]);
  const departmentMax = Math.max(1, ...departmentCounts.map(([, v]) => v.total));

  const cycles = useQuery({ queryKey: ["performance-cycles"], queryFn: async () => (await api.get<PerformanceCycle[]>("/performance-cycles")).data });
  const perfGoalsQueries = useQueries({
    queries: (employees.data ?? []).map((e) => ({
      queryKey: ["goals", e.id, perfCycleId],
      queryFn: async () => (await api.get<Goal[]>(`/goals/employee/${e.id}/cycle/${perfCycleId}`)).data,
      enabled: !!perfCycleId,
    })),
  });
  const perfReviewsQueries = useQueries({
    queries: (employees.data ?? []).map((e) => ({
      queryKey: ["performance-reviews", e.id, perfCycleId],
      queryFn: async () => (await api.get<PerformanceReview[]>(`/performance-reviews/employee/${e.id}/cycle/${perfCycleId}`)).data,
      enabled: !!perfCycleId,
    })),
  });
  const performanceSummary = useMemo(() => {
    const allGoals = perfGoalsQueries.flatMap((q) => q.data ?? []);
    const allReviews = perfReviewsQueries.flatMap((q) => q.data ?? []);
    const completed = allGoals.filter((g) => g.status === "COMPLETED").length;
    const avgRating = allReviews.length ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : 0;
    return { totalGoals: allGoals.length, completed, avgRating, reviewCount: allReviews.length };
  }, [perfGoalsQueries, perfReviewsQueries]);
  const perfLoading = perfCycleId && (perfGoalsQueries.some((q) => q.isLoading) || perfReviewsQueries.some((q) => q.isLoading));

  const dashboard = useQuery({ queryKey: ["reports", "dashboard"], queryFn: async () => (await api.get<DashboardStats>("/reports/dashboard")).data });

  const attendanceReport = useQuery({
    queryKey: ["reports", "attendance", attMonth, attYear, attEmployeeId],
    queryFn: async () =>
      (await api.get<AttendanceReport>("/reports/attendance", { params: { month: attMonth, year: attYear, employeeId: attEmployeeId || undefined } })).data,
  });

  const leaveReport = useQuery({
    queryKey: ["reports", "leave", leaveYear, leaveEmployeeId],
    queryFn: async () => (await api.get<LeaveReport>("/reports/leave", { params: { year: leaveYear, employeeId: leaveEmployeeId || undefined } })).data,
  });

  const myPayslips = useQuery({
    queryKey: ["payslips", "me", "runs"],
    queryFn: async () => (await api.get<Payslip[]>("/payroll/payslips/me")).data,
  });
  const availableRuns = useMemo(() => {
    const seen = new Map<string, Payslip["payrollRun"]>();
    for (const p of myPayslips.data ?? []) if (p.payrollRun) seen.set(p.payrollRunId, p.payrollRun);
    return Array.from(seen.values()).sort((a, b) => (b!.year - a!.year) || (b!.month - a!.month));
  }, [myPayslips.data]);

  const payrollRegister = useQuery({
    queryKey: ["reports", "payroll", payrollRunId],
    queryFn: async () => (await api.get<PayrollRegisterType>(`/reports/payroll/${payrollRunId}`)).data,
    enabled: !!payrollRunId,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Insights</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">Reports</h1>
      </div>

      <Tabs
        layoutId="reports-tabs"
        tabs={[
          {
            label: "Dashboard",
            content: (
              dashboard.isError ? <ErrorState message="Couldn't load the dashboard." onRetry={() => dashboard.refetch()} /> :
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                    <p className="text-xs text-ink-500 uppercase tracking-wide">Active employees</p>
                    <p className="font-display text-2xl font-semibold text-ink-900 tabular-nums mt-1">{dashboard.data?.activeEmployeeCount ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                    <p className="text-xs text-ink-500 uppercase tracking-wide">Present today</p>
                    <p className="font-display text-2xl font-semibold text-ink-900 tabular-nums mt-1">{dashboard.data?.todayAttendancePercent ?? 0}%</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                    <p className="text-xs text-ink-500 uppercase tracking-wide">Pending leave</p>
                    <p className="font-display text-2xl font-semibold text-ink-900 tabular-nums mt-1">{dashboard.data?.pendingLeaveApprovals ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                    <p className="text-xs text-ink-500 uppercase tracking-wide">Pending expenses</p>
                    <p className="font-display text-2xl font-semibold text-ink-900 tabular-nums mt-1">{dashboard.data?.pendingExpenseClaims ?? 0}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                  <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">Headcount by status</p>
                  {dashboard.data?.headcountByStatus.length ? (
                    <BarChart
                      data={dashboard.data.headcountByStatus.map((h) => ({
                        label: h.status,
                        value: h.count,
                        color: h.status === "ACTIVE" ? "var(--status-good)" : h.status === "ON_NOTICE" ? "var(--status-warn)" : "var(--status-critical)",
                      }))}
                    />
                  ) : (
                    <p className="text-xs text-ink-300">No data.</p>
                  )}
                </div>
              </div>
            ),
          },
          {
            label: "Attendance",
            content: (
              <div>
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div>
                    <label htmlFor="att-report-month" className="block text-xs font-medium text-ink-700 mb-1.5">Month</label>
                    <select id="att-report-month" value={attMonth} onChange={(e) => setAttMonth(Number(e.target.value))} className={`${inputClass} w-auto`}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="att-report-year" className="block text-xs font-medium text-ink-700 mb-1.5">Year</label>
                    <input id="att-report-year" type="number" value={attYear} onChange={(e) => setAttYear(Number(e.target.value))} className={`${inputClass} w-24`} />
                  </div>
                  <div>
                    <label htmlFor="att-report-employee" className="block text-xs font-medium text-ink-700 mb-1.5">Employee</label>
                    <select id="att-report-employee" value={attEmployeeId} onChange={(e) => setAttEmployeeId(e.target.value)} className={`${inputClass} w-auto`}>
                      <option value="">{isManager ? "All my team" : "All employees"}</option>
                      {scopedEmployees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                  <div className="ml-auto">
                    <ExportButton
                      onClick={() =>
                        exportCsv(
                          `attendance-${attMonth}-${attYear}.csv`,
                          [
                            ["Employee Code", "Name", "Working Days", "Present", "Late", "Half Day", "On Leave", "Absent"],
                            ...(attendanceReport.data?.employees ?? []).map((r) => [
                              r.employee.employeeCode, `${r.employee.firstName} ${r.employee.lastName}`, r.workingDays, r.presentDays, r.lateDays, r.halfDays, r.onLeaveDays, r.unrecordedAbsentDays,
                            ]),
                          ],
                        )
                      }
                    />
                  </div>
                </div>
                {attendanceReport.isLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                )}
                {attendanceReport.isError && <ErrorState message="Couldn't load the attendance report." onRetry={() => attendanceReport.refetch()} />}
                {!attendanceReport.isLoading && !attendanceReport.isError && (attendanceReport.data?.employees.length ?? 0) === 0 && (
                  <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">No employees found.</div>
                )}
                {(attendanceReport.data?.employees.length ?? 0) > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-line">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 text-left text-xs text-ink-500 uppercase tracking-wide">
                          <th className="px-4 py-2.5 font-medium">Employee</th>
                          <th className="px-4 py-2.5 font-medium text-right">Present</th>
                          <th className="px-4 py-2.5 font-medium text-right">Late</th>
                          <th className="px-4 py-2.5 font-medium text-right">Half day</th>
                          <th className="px-4 py-2.5 font-medium text-right">On leave</th>
                          <th className="px-4 py-2.5 font-medium text-right">Absent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceReport.data?.employees.map((r) => (
                          <tr key={r.employee.id} className="border-t border-line">
                            <td className="px-4 py-2.5 text-ink-900">{r.employee.firstName} {r.employee.lastName} <span className="text-ink-300 font-mono text-xs">{r.employee.employeeCode}</span></td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-status-good">{r.presentDays}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-status-warn">{r.lateDays}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-500">{r.halfDays}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-accent">{r.onLeaveDays}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-status-critical">{r.unrecordedAbsentDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "Leave",
            content: (
              <div>
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div>
                    <label htmlFor="leave-report-year" className="block text-xs font-medium text-ink-700 mb-1.5">Year</label>
                    <input id="leave-report-year" type="number" value={leaveYear} onChange={(e) => setLeaveYear(Number(e.target.value))} className={`${inputClass} w-24`} />
                  </div>
                  <div>
                    <label htmlFor="leave-report-employee" className="block text-xs font-medium text-ink-700 mb-1.5">Employee</label>
                    <select id="leave-report-employee" value={leaveEmployeeId} onChange={(e) => setLeaveEmployeeId(e.target.value)} className={`${inputClass} w-auto`}>
                      <option value="">{isManager ? "All my team" : "All employees"}</option>
                      {scopedEmployees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                  <div className="ml-auto">
                    <ExportButton
                      onClick={() =>
                        exportCsv(
                          `leave-${leaveYear}.csv`,
                          [
                            ["Employee Code", "Name", "Leave Type", "Allocated", "Carried Forward", "Used", "Balance"],
                            ...(leaveReport.data?.employees ?? []).flatMap((r) =>
                              r.leaveBalances.map((b) => [r.employee.employeeCode, `${r.employee.firstName} ${r.employee.lastName}`, b.leaveType, b.allocated, b.carriedForward, b.used, b.balance]),
                            ),
                          ],
                        )
                      }
                    />
                  </div>
                </div>
                {leaveReport.isLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                )}
                {leaveReport.isError && <ErrorState message="Couldn't load the leave report." onRetry={() => leaveReport.refetch()} />}
                <div className="space-y-4">
                  {leaveReport.data?.employees.map((r) => (
                    <div key={r.employee.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4">
                      <p className="text-sm font-medium text-ink-900 mb-2">{r.employee.firstName} {r.employee.lastName}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {r.leaveBalances.map((b) => (
                          <div key={b.leaveType} className="rounded-lg bg-surface-2 px-3 py-2">
                            <p className="text-[11px] text-ink-500">{b.leaveType}</p>
                            <p className="text-sm font-semibold text-ink-900 tabular-nums">{b.balance}<span className="text-ink-300 font-normal"> / {b.allocated + b.carriedForward}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {leaveReport.data?.employees.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">No employees found.</div>
                  )}
                </div>
              </div>
            ),
          },
          {
            label: "Payroll Register",
            content: (
              <div>
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div>
                    <label htmlFor="payroll-run-select" className="block text-xs font-medium text-ink-700 mb-1.5">Payroll run</label>
                    <select id="payroll-run-select" value={payrollRunId} onChange={(e) => setPayrollRunId(e.target.value)} className={`${inputClass} w-auto`}>
                      <option value="">Select a run…</option>
                      {availableRuns.map((r) => (
                        <option key={r!.id} value={r!.id}>{new Date(2000, r!.month - 1, 1).toLocaleString("en-IN", { month: "long" })} {r!.year} — {r!.status}</option>
                      ))}
                    </select>
                  </div>
                  {payrollRegister.data && (
                    <div className="ml-auto">
                      <ExportButton
                        onClick={() =>
                          exportCsv(
                            `payroll-register-${payrollRunId}.csv`,
                            [
                              ["Employee Code", "Name", "Gross", "PF", "ESI", "PT", "TDS", "Other Deductions", "Net Pay"],
                              ...payrollRegister.data!.payslips.map((p) => [
                                p.employee.employeeCode, `${p.employee.firstName} ${p.employee.lastName}`, p.grossEarnings, p.providentFund, p.esi, p.professionalTax, p.tds, p.otherDeductions, p.netPay,
                              ]),
                            ],
                          )
                        }
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-ink-300 mb-4">Runs shown are limited to those that include your own payslip — there&apos;s no company-wide run listing endpoint yet.</p>
                {payrollRegister.data && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-4">
                        <p className="text-[11px] text-ink-500 uppercase tracking-wide">Employees paid</p>
                        <p className="text-lg font-semibold text-ink-900 tabular-nums">{payrollRegister.data.employeeCount}</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-4">
                        <p className="text-[11px] text-ink-500 uppercase tracking-wide">Total gross</p>
                        <p className="text-lg font-semibold text-ink-900 tabular-nums">₹{payrollRegister.data.totals.grossEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-4">
                        <p className="text-[11px] text-ink-500 uppercase tracking-wide">Total deductions</p>
                        <p className="text-lg font-semibold text-ink-900 tabular-nums">₹{(payrollRegister.data.totals.providentFund + payrollRegister.data.totals.esi + payrollRegister.data.totals.professionalTax + payrollRegister.data.totals.tds + payrollRegister.data.totals.otherDeductions).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-4">
                        <p className="text-[11px] text-ink-500 uppercase tracking-wide">Total net pay</p>
                        <p className="text-lg font-semibold text-ink-900 tabular-nums">₹{payrollRegister.data.totals.netPay.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-line">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-2 text-left text-xs text-ink-500 uppercase tracking-wide">
                            <th className="px-4 py-2.5 font-medium">Employee</th>
                            <th className="px-4 py-2.5 font-medium text-right">Gross</th>
                            <th className="px-4 py-2.5 font-medium text-right">Deductions</th>
                            <th className="px-4 py-2.5 font-medium text-right">Net pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollRegister.data.payslips.map((p) => (
                            <tr key={p.id} className="border-t border-line">
                              <td className="px-4 py-2.5 text-ink-900">{p.employee.firstName} {p.employee.lastName} <span className="text-ink-300 font-mono text-xs">{p.employee.employeeCode}</span></td>
                              <td className="px-4 py-2.5 text-right tabular-nums">₹{p.grossEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-status-critical">₹{(p.providentFund + p.esi + p.professionalTax + p.tds + p.otherDeductions).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold">₹{p.netPay.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ),
          },
          {
            label: "Departments",
            content: (
              <div>
                <div className="flex justify-end mb-4">
                  <ExportButton
                    onClick={() =>
                      exportCsv("department-headcount.csv", [
                        ["Department", "Active", "Total"],
                        ...departmentCounts.map(([name, v]) => [name, v.active, v.total]),
                      ])
                    }
                  />
                </div>
                {departmentCounts.length === 0 ? <p className="text-xs text-ink-300">No data.</p> : (
                  <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5 space-y-2.5">
                    {departmentCounts.map(([name, v]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-40 text-xs text-ink-500 truncate shrink-0">{name}</span>
                        <div className="flex-1 h-5 rounded-full bg-surface-2 overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${(v.total / departmentMax) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-ink-900 tabular-nums w-24 text-right">{v.active} active / {v.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "Performance",
            content: (
              <div>
                <div className="mb-4">
                  <label htmlFor="perf-cycle-select" className="block text-xs font-medium text-ink-700 mb-1.5">Cycle</label>
                  <select id="perf-cycle-select" value={perfCycleId} onChange={(e) => setPerfCycleId(e.target.value)} className={`${inputClass} w-auto`}>
                    <option value="">Select a cycle…</option>
                    {cycles.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {!perfCycleId && <p className="text-xs text-ink-300">Pick a cycle to see company-wide goal completion and review ratings.</p>}
                {perfLoading && <p className="text-sm text-ink-300 py-6">Aggregating across the organization…</p>}
                {perfCycleId && !perfLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                      <p className="text-[11px] text-ink-500 uppercase tracking-wide">Total goals</p>
                      <p className="text-2xl font-semibold text-ink-900 tabular-nums mt-1">{performanceSummary.totalGoals}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                      <p className="text-[11px] text-ink-500 uppercase tracking-wide">Completed</p>
                      <p className="text-2xl font-semibold text-status-good tabular-nums mt-1">{performanceSummary.completed}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                      <p className="text-[11px] text-ink-500 uppercase tracking-wide">Completion rate</p>
                      <p className="text-2xl font-semibold text-ink-900 tabular-nums mt-1">{performanceSummary.totalGoals ? Math.round((performanceSummary.completed / performanceSummary.totalGoals) * 100) : 0}%</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
                      <p className="text-[11px] text-ink-500 uppercase tracking-wide">Avg. review rating</p>
                      <p className="text-2xl font-semibold text-ink-900 tabular-nums mt-1">{performanceSummary.avgRating.toFixed(1)} <span className="text-xs text-ink-300 font-normal">/ 5 ({performanceSummary.reviewCount})</span></p>
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
