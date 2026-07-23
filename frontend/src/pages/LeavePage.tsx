import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CalendarPlus, Check, Gift, Settings2, X as XIcon } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { extractErrorMessage } from "../utils/apiError";
import Drawer from "../components/Drawer";
import MonthCalendar, { type DayMarker } from "../components/MonthCalendar";
import Timeline, { type TimelineItem } from "../components/Timeline";
import { dateKey, parseDateOnly } from "../utils/date";
import type { CompOffCredit, Employee, LeaveBalance, LeaveRequest, LeaveType } from "../api/types";

const APPROVER_ROLES = ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"];
const HR_ROLES = ["HR_ADMIN", "SUPER_ADMIN"];
const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

const applySchema = z
  .object({
    leaveTypeId: z.string().min(1, "Required"),
    startDate: z.string().min(1, "Required"),
    endDate: z.string().min(1, "Required"),
    isHalfDay: z.boolean(),
    reason: z.string().min(3, "Tell us a little more"),
  })
  .refine((d) => !d.isHalfDay || d.startDate === d.endDate, { message: "Half day requires the same start and end date", path: ["isHalfDay"] });
type ApplyForm = z.infer<typeof applySchema>;

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const leaveTypeSchema = z.object({
  name: z.string().min(1, "Required"),
  defaultAnnualDays: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  carryForwardAllowed: z.boolean(),
  maxCarryForwardDays: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  isPaid: z.boolean(),
});
type LeaveTypeForm = z.infer<typeof leaveTypeSchema>;

const compOffSchema = z.object({
  employeeId: z.string().min(1, "Required"),
  earnedForDate: z.string().min(1, "Required"),
  expiresInDays: z.preprocess(emptyToUndefined, z.coerce.number().min(1).optional()),
});
type CompOffForm = z.infer<typeof compOffSchema>;

const statusTone = { PENDING: "warn", APPROVED: "good", REJECTED: "critical", CANCELLED: "neutral" } as const;
const dayMarkerTone: Record<string, DayMarker["tone"]> = { PENDING: "warn", APPROVED: "good", REJECTED: "critical" };

export default function LeavePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [showLeaveTypeAdmin, setShowLeaveTypeAdmin] = useState(false);
  const [showCompOffGrant, setShowCompOffGrant] = useState(false);
  const [compOffEmployeeId, setCompOffEmployeeId] = useState("");
  const isApprover = user ? APPROVER_ROLES.includes(user.role) : false;
  const isHr = user ? HR_ROLES.includes(user.role) : false;

  const leaveTypes = useQuery({ queryKey: ["leave-types"], queryFn: async () => (await api.get<LeaveType[]>("/leave-types")).data });
  const balances = useQuery({ queryKey: ["leave-balances"], queryFn: async () => (await api.get<LeaveBalance[]>("/leave-requests/me/balance")).data });
  const myRequests = useQuery({ queryKey: ["leave-requests", "me"], queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/me")).data });
  const pendingApprovals = useQuery({
    queryKey: ["leave-requests", "pending-approvals"],
    queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/pending-approvals")).data,
    enabled: isApprover,
  });
  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data, enabled: isApprover });
  const scopedEmployees = useMemo(
    () => (user?.role === "MANAGER" ? (employees.data ?? []).filter((e) => e.managerId === user.employeeId) : employees.data ?? []),
    [employees.data, user],
  );
  const compOffCredits = useQuery({
    queryKey: ["comp-off", compOffEmployeeId],
    queryFn: async () => (await api.get<CompOffCredit[]>(`/comp-off/employee/${compOffEmployeeId}`)).data,
    enabled: !!compOffEmployeeId,
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ApplyForm>({ resolver: zodResolver(applySchema), defaultValues: { isHalfDay: false } });
  const isHalfDay = watch("isHalfDay");

  function invalidateLeave() {
    queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
  }
  const applyLeave = useMutation({
    mutationFn: async (data: ApplyForm) => (await api.post("/leave-requests", data)).data,
    onSuccess: () => { invalidateLeave(); reset(); setShowForm(false); toast.success("Leave request submitted"); },
    onError: (err) => toast.error("Could not submit the request", extractErrorMessage(err)),
  });
  const cancelLeave = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/leave-requests/${id}/cancel`)).data,
    onSuccess: () => { invalidateLeave(); toast.success("Leave request cancelled"); },
    onError: (err) => toast.error("Could not cancel this request", extractErrorMessage(err)),
  });
  const approveLeave = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/leave-requests/${id}/approve`, {})).data,
    onSuccess: () => { invalidateLeave(); toast.success("Leave approved"); },
    onError: (err) => toast.error("Could not approve this request", extractErrorMessage(err)),
  });
  const rejectLeave = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/leave-requests/${id}/reject`, {})).data,
    onSuccess: () => { invalidateLeave(); toast.success("Leave rejected"); },
    onError: (err) => toast.error("Could not reject this request", extractErrorMessage(err)),
  });

  async function handleCancelLeave(id: string) {
    const ok = await confirm({ title: "Cancel this leave request?", confirmLabel: "Cancel request", cancelLabel: "Keep it", tone: "danger" });
    if (ok) cancelLeave.mutate(id);
  }

  const { register: registerLeaveType, handleSubmit: submitLeaveType, reset: resetLeaveType, formState: { errors: leaveTypeErrors } } = useForm<LeaveTypeForm>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: { carryForwardAllowed: false, isPaid: true },
  });
  const createLeaveType = useMutation({
    mutationFn: async (data: LeaveTypeForm) => (await api.post("/leave-types", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["leave-types"] }); resetLeaveType(); toast.success(`"${variables.name}" added`); },
    onError: (err) => toast.error("Could not create this leave type", extractErrorMessage(err)),
  });

  const { register: registerCompOff, handleSubmit: submitCompOff, reset: resetCompOff, formState: { errors: compOffErrors } } = useForm<CompOffForm>({ resolver: zodResolver(compOffSchema) });
  const grantCompOff = useMutation({
    mutationFn: async (data: CompOffForm) => (await api.post("/comp-off/grant", data)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comp-off"] }); resetCompOff(); setShowCompOffGrant(false); toast.success("Comp-off granted"); },
    onError: (err) => toast.error("Could not grant comp-off", extractErrorMessage(err)),
  });

  const calendarMarkers = useMemo(() => {
    const map: Record<string, DayMarker[]> = {};
    for (const r of myRequests.data ?? []) {
      if (r.status === "CANCELLED") continue;
      const cursor = parseDateOnly(r.startDate);
      const end = parseDateOnly(r.endDate);
      while (cursor.getTime() <= end.getTime()) {
        const key = dateKey(cursor);
        map[key] = [...(map[key] ?? []), { tone: (dayMarkerTone[r.status] ?? "neutral") as DayMarker["tone"] }];
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    if (isApprover) {
      for (const r of pendingApprovals.data ?? []) {
        const cursor = parseDateOnly(r.startDate);
        const end = parseDateOnly(r.endDate);
        while (cursor.getTime() <= end.getTime()) {
          const key = dateKey(cursor);
          map[key] = [...(map[key] ?? []), { tone: "accent" }];
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    return map;
  }, [myRequests.data, pendingApprovals.data, isApprover]);

  const timelineItems: TimelineItem[] = (myRequests.data ?? []).map((r) => ({
    key: r.id,
    icon: <span className="text-[10px] font-semibold">{r.dayCount}d</span>,
    tone: statusTone[r.status],
    title: `${r.leaveType?.name ?? "Leave"} · ${r.startDate.slice(0, 10)} → ${r.endDate.slice(0, 10)}`,
    meta: (
      <div className="flex items-center gap-2">
        <span>{r.status}</span>
        {r.status === "PENDING" && (
          <button onClick={() => handleCancelLeave(r.id)} className="text-ink-500 hover:text-ink-900 underline">Cancel</button>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Time off</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Leave</h1>
        </div>
        <div className="flex items-center gap-2">
          {isHr && (
            <button onClick={() => setShowLeaveTypeAdmin(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line text-ink-700 text-sm font-semibold px-4 py-2.5 hover:bg-surface-2 transition-colors">
              <Settings2 size={14} strokeWidth={2} /> Leave policies
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-strong transition-colors">
            <CalendarPlus size={15} strokeWidth={2} /> Apply for leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MonthCalendar markers={calendarMarkers} />
          {isApprover && <p className="text-[11px] text-ink-300 -mt-4">Purple dots are your team&apos;s pending requests.</p>}

          {isApprover && (pendingApprovals.data?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Pending your approval</h2>
              <div className="space-y-2">
                {pendingApprovals.data?.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{r.employee?.firstName} {r.employee?.lastName} · {r.leaveType?.name}</p>
                      <p className="text-xs text-ink-500">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)} · {r.reason}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approveLeave.mutate(r.id)} aria-label="Approve" className="h-11 w-11 rounded-full bg-status-good-soft text-status-good flex items-center justify-center hover:brightness-95 transition-all"><Check size={15} strokeWidth={2} /></button>
                      <button onClick={() => rejectLeave.mutate(r.id)} aria-label="Reject" className="h-11 w-11 rounded-full bg-status-critical-soft text-status-critical flex items-center justify-center hover:brightness-95 transition-all"><XIcon size={15} strokeWidth={2} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
            <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">Balance</p>
            <div className="space-y-2.5">
              {balances.data?.map((b) => (
                <div key={b.leaveTypeId} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{b.leaveTypeName}</span>
                  <span className="font-semibold text-ink-900 tabular-nums">{b.balance}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink-900 mb-3">My requests</h2>
            <Timeline items={timelineItems} />
          </div>

          {isApprover && (
            <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-500 uppercase tracking-wide">Comp-off</p>
                {isHr && (
                  <button onClick={() => setShowCompOffGrant(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <Gift size={12} strokeWidth={2} /> Grant
                  </button>
                )}
              </div>
              <select value={compOffEmployeeId} onChange={(e) => setCompOffEmployeeId(e.target.value)} className={`${inputClass} mb-3`}>
                <option value="">Select an employee…</option>
                {scopedEmployees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
              {compOffEmployeeId && (
                compOffCredits.data?.length ? (
                  <div className="space-y-1.5">
                    {compOffCredits.data.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink-700">Earned {c.earnedForDate.slice(0, 10)}</span>
                        <span className="text-ink-500">expires {c.expiresAt.slice(0, 10)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-300">No available comp-off credits.</p>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Apply for leave">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Apply for leave</h2>
          <form onSubmit={handleSubmit((data) => applyLeave.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="leave-type" className="block text-xs font-medium text-ink-700 mb-1.5">Leave type</label>
              <select id="leave-type" {...register("leaveTypeId")} className={inputClass}>
                <option value="">Select…</option>
                {leaveTypes.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {errors.leaveTypeId && <p className="text-xs text-status-critical mt-1">{errors.leaveTypeId.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" {...register("isHalfDay")} className="h-4 w-4" /> Half day
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="leave-start-date" className="block text-xs font-medium text-ink-700 mb-1.5">Start date</label>
                <input id="leave-start-date" type="date" {...register("startDate")} className={inputClass} />
                {errors.startDate && <p className="text-xs text-status-critical mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <label htmlFor="leave-end-date" className="block text-xs font-medium text-ink-700 mb-1.5">End date</label>
                <input id="leave-end-date" type="date" disabled={isHalfDay} {...register("endDate")} className={`${inputClass} disabled:bg-surface-2`} />
                {errors.endDate && <p className="text-xs text-status-critical mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="leave-reason" className="block text-xs font-medium text-ink-700 mb-1.5">Reason</label>
              <textarea id="leave-reason" {...register("reason")} rows={3} className={inputClass} />
              {errors.reason && <p className="text-xs text-status-critical mt-1">{errors.reason.message}</p>}
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={applyLeave.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {applyLeave.isPending ? "Submitting…" : "Submit request"}
            </motion.button>
          </form>
        </div>
      </Drawer>

      <Drawer open={showLeaveTypeAdmin} onClose={() => setShowLeaveTypeAdmin(false)} title="Leave policies">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Leave policies</h2>
          <p className="text-sm text-ink-500 mb-6">Configure the leave types available across the company.</p>

          <div className="space-y-2 mb-6">
            {leaveTypes.data?.map((t) => (
              <div key={t.id} className="rounded-xl border border-line px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">{t.name}</p>
                  <p className="text-xs text-ink-500">{t.defaultAnnualDays} days/year · {t.carryForwardAllowed ? "carry-forward allowed" : "no carry-forward"} · {t.isPaid ? "paid" : "unpaid"}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitLeaveType((data) => createLeaveType.mutate(data))} className="space-y-4 pt-4 border-t border-line">
            <p className="text-sm font-semibold text-ink-900">Add a leave type</p>
            <div>
              <label htmlFor="lt-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
              <input id="lt-name" {...registerLeaveType("name")} placeholder="Work From Home" className={inputClass} />
              {leaveTypeErrors.name && <p className="text-xs text-status-critical mt-1">{leaveTypeErrors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lt-annual-days" className="block text-xs font-medium text-ink-700 mb-1.5">Default annual days</label>
                <input id="lt-annual-days" type="number" {...registerLeaveType("defaultAnnualDays")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="lt-carry-forward" className="block text-xs font-medium text-ink-700 mb-1.5">Max carry-forward</label>
                <input id="lt-carry-forward" type="number" {...registerLeaveType("maxCarryForwardDays")} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" {...registerLeaveType("carryForwardAllowed")} className="h-4 w-4" /> Carry-forward allowed
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" {...registerLeaveType("isPaid")} className="h-4 w-4" /> Paid
              </label>
            </div>
            <button type="submit" disabled={createLeaveType.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createLeaveType.isPending ? "Adding…" : "Add leave type"}
            </button>
          </form>
        </div>
      </Drawer>

      <Drawer open={showCompOffGrant} onClose={() => setShowCompOffGrant(false)} title="Grant comp-off">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Grant comp-off</h2>
          <form onSubmit={submitCompOff((data) => grantCompOff.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="comp-off-employee" className="block text-xs font-medium text-ink-700 mb-1.5">Employee</label>
              <select id="comp-off-employee" {...registerCompOff("employeeId")} className={inputClass}>
                <option value="">Select…</option>
                {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
              {compOffErrors.employeeId && <p className="text-xs text-status-critical mt-1">{compOffErrors.employeeId.message}</p>}
            </div>
            <div>
              <label htmlFor="comp-off-date" className="block text-xs font-medium text-ink-700 mb-1.5">Date worked (holiday/weekly-off)</label>
              <input id="comp-off-date" type="date" {...registerCompOff("earnedForDate")} className={inputClass} />
              {compOffErrors.earnedForDate && <p className="text-xs text-status-critical mt-1">{compOffErrors.earnedForDate.message}</p>}
            </div>
            <div>
              <label htmlFor="comp-off-expires" className="block text-xs font-medium text-ink-700 mb-1.5">Expires in (days, default 90)</label>
              <input id="comp-off-expires" type="number" {...registerCompOff("expiresInDays")} className={inputClass} />
            </div>
            <button type="submit" disabled={grantCompOff.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {grantCompOff.isPending ? "Granting…" : "Grant comp-off"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
