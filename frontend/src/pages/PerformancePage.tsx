import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Award, Plus, Star, Target, TrendingUp } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import Drawer from "../components/Drawer";
import Tabs from "../components/Tabs";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";
import ErrorState from "../components/ErrorState";
import type { Designation, Employee, Goal, GoalStatus, PerformanceCycle, PerformanceReview, PromotionRecord } from "../api/types";

const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

const cycleStatusTone = { DRAFT: "neutral", ACTIVE: "good", CLOSED: "critical" } as const;
const goalStatusTone: Record<GoalStatus, "neutral" | "warn" | "good"> = { NOT_STARTED: "neutral", IN_PROGRESS: "warn", COMPLETED: "good" };

const cycleSchema = z.object({
  name: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
});
type CycleForm = z.infer<typeof cycleSchema>;

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const goalSchema = z.object({
  title: z.string().min(2, "Required"),
  description: z.string().optional(),
  weightPercent: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(100).optional()),
  targetValue: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
  metricUnit: z.string().optional(),
});
type GoalForm = z.infer<typeof goalSchema>;

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
});
type ReviewForm = z.infer<typeof reviewSchema>;

const promotionSchema = z.object({
  newDesignationId: z.string().min(1, "Required"),
  effectiveDate: z.string().min(1, "Required"),
  note: z.string().optional(),
});
type PromotionForm = z.infer<typeof promotionSchema>;

function GoalProgressEditor({ goal, canEdit }: { goal: Goal; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [achieved, setAchieved] = useState(goal.achievedValue ?? 0);
  const [status, setStatus] = useState<GoalStatus>(goal.status);

  const update = useMutation({
    mutationFn: async () => (await api.patch(`/goals/${goal.id}/progress`, { achievedValue: achieved, status })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); toast.success("Progress saved"); },
    onError: (err) => toast.error("Could not save progress", extractErrorMessage(err)),
  });

  const pct = goal.targetValue ? Math.min(100, Math.round(((goal.achievedValue ?? 0) / goal.targetValue) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">{goal.title}</p>
          {goal.description && <p className="text-xs text-ink-500 mt-0.5">{goal.description}</p>}
        </div>
        <StatusPill tone={goalStatusTone[goal.status]}>{goal.status.replace("_", " ")}</StatusPill>
      </div>
      {goal.targetValue != null && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-ink-500 mt-1">
            {goal.achievedValue ?? 0}{goal.metricUnit} of {goal.targetValue}{goal.metricUnit} · weight {goal.weightPercent}%
          </p>
        </div>
      )}
      {canEdit && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
          <input
            type="number"
            value={achieved}
            onChange={(e) => setAchieved(Number(e.target.value))}
            className="w-24 rounded-lg border border-line bg-surface-0 px-2 py-1.5 text-xs text-ink-900 outline-none focus:border-accent"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)} className="rounded-lg border border-line bg-surface-0 px-2 py-1.5 text-xs text-ink-900 outline-none focus:border-accent">
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button onClick={() => update.mutate()} disabled={update.isPending} className="ml-auto text-xs font-semibold text-accent hover:underline disabled:opacity-60">
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ label, review }: { label: string; review?: PerformanceReview }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
      <p className="text-xs text-ink-500 uppercase tracking-wide mb-2">{label}</p>
      {review ? (
        <>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} strokeWidth={1.75} className={i < Math.round(review.rating) ? "text-brass fill-brass" : "text-ink-300"} />
            ))}
            <span className="text-xs text-ink-500 ml-1">{review.rating.toFixed(1)}</span>
          </div>
          {review.strengths && <p className="text-xs text-ink-700 mb-1"><span className="font-medium">Strengths:</span> {review.strengths}</p>}
          {review.improvements && <p className="text-xs text-ink-700"><span className="font-medium">Improvements:</span> {review.improvements}</p>}
          <p className="text-[11px] text-ink-300 mt-2">{new Date(review.submittedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
        </>
      ) : (
        <p className="text-xs text-ink-300">Not submitted yet.</p>
      )}
    </div>
  );
}

export default function PerformancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isHr = user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN";
  const isManager = user?.role === "MANAGER";

  const [showNewCycle, setShowNewCycle] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [cycleId, setCycleId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>(user?.employeeId ?? "");

  const cycles = useQuery({ queryKey: ["performance-cycles"], queryFn: async () => (await api.get<PerformanceCycle[]>("/performance-cycles")).data });
  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data, enabled: isHr || isManager });
  const designations = useQuery({ queryKey: ["designations"], queryFn: async () => (await api.get<Designation[]>("/designations")).data, enabled: isHr });

  useEffect(() => {
    if (!cycleId && cycles.data && cycles.data.length > 0) {
      const active = cycles.data.find((c) => c.status === "ACTIVE") ?? cycles.data[0];
      setCycleId(active.id);
    }
  }, [cycles.data, cycleId]);

  const selectableEmployees = useMemo(() => {
    if (isHr) return employees.data ?? [];
    if (isManager) return (employees.data ?? []).filter((e) => e.managerId === user?.employeeId || e.id === user?.employeeId);
    return [];
  }, [employees.data, isHr, isManager, user?.employeeId]);

  const canManageSelected = isHr || (isManager && (selectableEmployees.some((e) => e.id === employeeId && e.managerId === user?.employeeId)));
  const isSelf = employeeId === user?.employeeId;

  const goals = useQuery({
    queryKey: ["goals", employeeId, cycleId],
    queryFn: async () => (await api.get<Goal[]>(`/goals/employee/${employeeId}/cycle/${cycleId}`)).data,
    enabled: !!employeeId && !!cycleId,
  });
  const reviews = useQuery({
    queryKey: ["performance-reviews", employeeId, cycleId],
    queryFn: async () => (await api.get<PerformanceReview[]>(`/performance-reviews/employee/${employeeId}/cycle/${cycleId}`)).data,
    enabled: !!employeeId && !!cycleId,
  });
  const promotions = useQuery({
    queryKey: ["promotions", employeeId],
    queryFn: async () => (await api.get<PromotionRecord[]>(`/promotions/employee/${employeeId}`)).data,
    enabled: !!employeeId && isHr,
  });

  const selfReview = reviews.data?.find((r) => r.type === "SELF");
  const managerReview = reviews.data?.find((r) => r.type === "MANAGER");

  const { register: registerCycle, handleSubmit: submitCycle, reset: resetCycle, formState: { errors: cycleErrors } } = useForm<CycleForm>({ resolver: zodResolver(cycleSchema) });
  const createCycle = useMutation({
    mutationFn: async (data: CycleForm) => (await api.post("/performance-cycles", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["performance-cycles"] }); resetCycle(); setShowNewCycle(false); toast.success(`"${variables.name}" created`); },
    onError: (err) => toast.error("Could not create this cycle", extractErrorMessage(err)),
  });
  const setCycleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.patch(`/performance-cycles/${id}/status/${status}`)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["performance-cycles"] }); toast.success(`Cycle ${variables.status.toLowerCase()}`); },
    onError: (err) => toast.error("Could not update this cycle", extractErrorMessage(err)),
  });

  const { register: registerGoal, handleSubmit: submitGoal, reset: resetGoal, formState: { errors: goalErrors } } = useForm<GoalForm>({ resolver: zodResolver(goalSchema) });
  const createGoal = useMutation({
    mutationFn: async (data: GoalForm) => (await api.post("/goals", { ...data, employeeId, cycleId })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); resetGoal(); setShowNewGoal(false); toast.success("Goal added"); },
    onError: (err) => toast.error("Could not add this goal", extractErrorMessage(err)),
  });

  const { register: registerSelfReview, handleSubmit: submitSelfReview, reset: resetSelfReview, formState: { errors: selfReviewErrors } } = useForm<ReviewForm>({ resolver: zodResolver(reviewSchema) });
  const submitSelf = useMutation({
    mutationFn: async (data: ReviewForm) => (await api.post("/performance-reviews/self", { ...data, employeeId, cycleId })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance-reviews"] }); resetSelfReview(); toast.success("Self review submitted"); },
    onError: (err) => toast.error("Could not submit your review", extractErrorMessage(err)),
  });

  const { register: registerMgrReview, handleSubmit: submitMgrReview, reset: resetMgrReview, formState: { errors: mgrReviewErrors } } = useForm<ReviewForm>({ resolver: zodResolver(reviewSchema) });
  const submitManager = useMutation({
    mutationFn: async (data: ReviewForm) => (await api.post("/performance-reviews/manager", { ...data, employeeId, cycleId })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance-reviews"] }); resetMgrReview(); toast.success("Manager review submitted"); },
    onError: (err) => toast.error("Could not submit this review", extractErrorMessage(err)),
  });

  const { register: registerPromo, handleSubmit: submitPromo, reset: resetPromo, formState: { errors: promoErrors } } = useForm<PromotionForm>({ resolver: zodResolver(promotionSchema) });
  const promote = useMutation({
    mutationFn: async (data: PromotionForm) => (await api.post("/promotions", { ...data, employeeId, cycleId })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["promotions"] }); queryClient.invalidateQueries({ queryKey: ["employees"] }); resetPromo(); setShowPromote(false); toast.success("Promotion recorded"); },
    onError: (err) => toast.error("Could not process this promotion", extractErrorMessage(err)),
  });

  const selectedCycle = cycles.data?.find((c) => c.id === cycleId);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Performance</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Goals & reviews</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className={`${inputClass} w-auto`}>
            {cycles.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedCycle && <StatusPill tone={cycleStatusTone[selectedCycle.status]}>{selectedCycle.status}</StatusPill>}
          {isHr && selectedCycle?.status === "DRAFT" && (
            <button onClick={() => setCycleStatus.mutate({ id: selectedCycle.id, status: "ACTIVE" })} className="text-xs font-semibold text-accent hover:underline">Activate</button>
          )}
          {isHr && selectedCycle?.status === "ACTIVE" && (
            <button onClick={() => setCycleStatus.mutate({ id: selectedCycle.id, status: "CLOSED" })} className="text-xs font-semibold text-status-critical hover:underline">Close</button>
          )}
          {isHr && (
            <button onClick={() => setShowNewCycle(true)} className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white text-xs font-semibold px-4 py-2 hover:bg-accent-strong transition-colors">
              <Plus size={13} strokeWidth={2.5} /> New cycle
            </button>
          )}
        </div>
      </div>

      {(isHr || isManager) && (
        <div className="mb-6 max-w-xs">
          <label htmlFor="perf-viewing" className="block text-xs font-medium text-ink-700 mb-1.5">Viewing</label>
          <select id="perf-viewing" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass}>
            {user?.employeeId && <option value={user.employeeId}>Myself</option>}
            {selectableEmployees.filter((e) => e.id !== user?.employeeId).map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>
      )}

      {!cycles.data?.length ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-300">
          No performance cycles yet. {isHr ? "Create one to get started." : "Check back once HR opens a cycle."}
        </div>
      ) : !employeeId ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-300">This account isn&apos;t linked to an employee record.</div>
      ) : (
        <Tabs
          layoutId="performance-tabs"
          tabs={[
            {
              label: "Goals",
              content: (
                <div>
                  {canManageSelected && (
                    <div className="flex justify-end mb-3">
                      <button onClick={() => setShowNewGoal(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                        <Target size={13} strokeWidth={2} /> Add goal
                      </button>
                    </div>
                  )}
                  {goals.isLoading && (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                  )}
                  {goals.isError && <ErrorState message="Couldn't load goals." onRetry={() => goals.refetch()} />}
                  {!goals.isLoading && !goals.isError && goals.data?.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">No goals set for this cycle.</div>
                  )}
                  <div className="space-y-3">
                    {goals.data?.map((g) => (
                      <GoalProgressEditor key={g.id} goal={g} canEdit={isSelf || canManageSelected} />
                    ))}
                  </div>
                </div>
              ),
            },
            {
              label: "Reviews",
              content: (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ReviewCard label="Self review" review={selfReview} />
                    <ReviewCard label="Manager review" review={managerReview} />
                  </div>
                  {isSelf && (
                    <form onSubmit={submitSelfReview((data) => submitSelf.mutate(data))} className="rounded-2xl border border-line bg-surface-1 shadow-card p-5 space-y-3">
                      <p className="text-sm font-semibold text-ink-900">{selfReview ? "Update your self review" : "Submit your self review"}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="self-review-rating" className="block text-xs font-medium text-ink-700 mb-1.5">Rating (1-5)</label>
                          <input id="self-review-rating" type="number" min={1} max={5} step={0.5} {...registerSelfReview("rating")} className={inputClass} />
                          {selfReviewErrors.rating && <p className="text-xs text-status-critical mt-1">{selfReviewErrors.rating.message}</p>}
                        </div>
                      </div>
                      <textarea {...registerSelfReview("strengths")} placeholder="Strengths" rows={2} className={inputClass} />
                      <textarea {...registerSelfReview("improvements")} placeholder="Areas to improve" rows={2} className={inputClass} />
                      <button type="submit" disabled={submitSelf.isPending} className="rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:bg-accent-strong disabled:opacity-60 transition-colors">
                        {submitSelf.isPending ? "Saving…" : "Submit"}
                      </button>
                    </form>
                  )}
                  {canManageSelected && !isSelf && (
                    <form onSubmit={submitMgrReview((data) => submitManager.mutate(data))} className="rounded-2xl border border-line bg-surface-1 shadow-card p-5 space-y-3">
                      <p className="text-sm font-semibold text-ink-900">{managerReview ? "Update manager review" : "Submit manager review"}</p>
                      <div>
                        <label htmlFor="mgr-review-rating" className="block text-xs font-medium text-ink-700 mb-1.5">Rating (1-5)</label>
                        <input id="mgr-review-rating" type="number" min={1} max={5} step={0.5} {...registerMgrReview("rating")} className={`${inputClass} w-32`} />
                        {mgrReviewErrors.rating && <p className="text-xs text-status-critical mt-1">{mgrReviewErrors.rating.message}</p>}
                      </div>
                      <textarea {...registerMgrReview("strengths")} placeholder="Strengths" rows={2} className={inputClass} />
                      <textarea {...registerMgrReview("improvements")} placeholder="Areas to improve" rows={2} className={inputClass} />
                      <button type="submit" disabled={submitManager.isPending} className="rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:bg-accent-strong disabled:opacity-60 transition-colors">
                        {submitManager.isPending ? "Saving…" : "Submit"}
                      </button>
                    </form>
                  )}
                </div>
              ),
            },
            ...(isHr
              ? [{
                  label: "Promotions",
                  content: (
                    <div>
                      <div className="flex justify-end mb-3">
                        <button onClick={() => setShowPromote(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                          <Award size={13} strokeWidth={2} /> Promote
                        </button>
                      </div>
                      {promotions.data?.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">No promotion history yet.</div>
                      )}
                      <div className="space-y-2">
                        {promotions.data?.map((p) => (
                          <div key={p.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center gap-3">
                            <span className="h-9 w-9 rounded-lg bg-brass-soft text-brass flex items-center justify-center shrink-0"><TrendingUp size={15} strokeWidth={1.75} /></span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink-900">{p.previousDesignation?.title} → {p.newDesignation?.title}</p>
                              <p className="text-xs text-ink-500">{new Date(p.effectiveDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}{p.note ? ` · ${p.note}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                }]
              : []),
          ]}
        />
      )}

      <Drawer open={showNewCycle} onClose={() => setShowNewCycle(false)} title="New performance cycle">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">New performance cycle</h2>
          <form onSubmit={submitCycle((data) => createCycle.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="cycle-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
              <input id="cycle-name" {...registerCycle("name")} placeholder="H2 2026" className={inputClass} />
              {cycleErrors.name && <p className="text-xs text-status-critical mt-1">{cycleErrors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cycle-start" className="block text-xs font-medium text-ink-700 mb-1.5">Start date</label>
                <input id="cycle-start" type="date" {...registerCycle("startDate")} className={inputClass} />
                {cycleErrors.startDate && <p className="text-xs text-status-critical mt-1">{cycleErrors.startDate.message}</p>}
              </div>
              <div>
                <label htmlFor="cycle-end" className="block text-xs font-medium text-ink-700 mb-1.5">End date</label>
                <input id="cycle-end" type="date" {...registerCycle("endDate")} className={inputClass} />
                {cycleErrors.endDate && <p className="text-xs text-status-critical mt-1">{cycleErrors.endDate.message}</p>}
              </div>
            </div>
            <button type="submit" disabled={createCycle.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createCycle.isPending ? "Creating…" : "Create cycle"}
            </button>
          </form>
        </div>
      </Drawer>

      <Drawer open={showNewGoal} onClose={() => setShowNewGoal(false)} title="Add a goal">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add a goal</h2>
          <form onSubmit={submitGoal((data) => createGoal.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="goal-title" className="block text-xs font-medium text-ink-700 mb-1.5">Title</label>
              <input id="goal-title" {...registerGoal("title")} className={inputClass} />
              {goalErrors.title && <p className="text-xs text-status-critical mt-1">{goalErrors.title.message}</p>}
            </div>
            <div>
              <label htmlFor="goal-description" className="block text-xs font-medium text-ink-700 mb-1.5">Description (optional)</label>
              <textarea id="goal-description" {...registerGoal("description")} rows={2} className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="goal-weight" className="block text-xs font-medium text-ink-700 mb-1.5">Weight %</label>
                <input id="goal-weight" type="number" {...registerGoal("weightPercent")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="goal-target" className="block text-xs font-medium text-ink-700 mb-1.5">Target</label>
                <input id="goal-target" type="number" {...registerGoal("targetValue")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="goal-unit" className="block text-xs font-medium text-ink-700 mb-1.5">Unit</label>
                <input id="goal-unit" {...registerGoal("metricUnit")} placeholder="%" className={inputClass} />
              </div>
            </div>
            <button type="submit" disabled={createGoal.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createGoal.isPending ? "Adding…" : "Add goal"}
            </button>
          </form>
        </div>
      </Drawer>

      <Drawer open={showPromote} onClose={() => setShowPromote(false)} title="Promote employee">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Promote employee</h2>
          <form onSubmit={submitPromo((data) => promote.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="promo-designation" className="block text-xs font-medium text-ink-700 mb-1.5">New designation</label>
              <select id="promo-designation" {...registerPromo("newDesignationId")} className={inputClass}>
                <option value="">Select…</option>
                {designations.data?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              {promoErrors.newDesignationId && <p className="text-xs text-status-critical mt-1">{promoErrors.newDesignationId.message}</p>}
            </div>
            <div>
              <label htmlFor="promo-effective-date" className="block text-xs font-medium text-ink-700 mb-1.5">Effective date</label>
              <input id="promo-effective-date" type="date" {...registerPromo("effectiveDate")} className={inputClass} />
              {promoErrors.effectiveDate && <p className="text-xs text-status-critical mt-1">{promoErrors.effectiveDate.message}</p>}
            </div>
            <div>
              <label htmlFor="promo-note" className="block text-xs font-medium text-ink-700 mb-1.5">Note (optional)</label>
              <textarea id="promo-note" {...registerPromo("note")} rows={2} className={inputClass} />
            </div>
            <button type="submit" disabled={promote.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {promote.isPending ? "Saving…" : "Promote"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
