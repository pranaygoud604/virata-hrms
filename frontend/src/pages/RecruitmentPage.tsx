import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, FileText, Plus, X } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import { initialsFromName } from "../utils/format";
import { escapeHtml, isSafeHttpUrl } from "../utils/html";
import Drawer from "../components/Drawer";
import ErrorState from "../components/ErrorState";
import StatusPill from "../components/StatusPill";
import type { Candidate, CandidateStage, Department, Designation, Employee, JobPosting } from "../api/types";

const ADMIN_ROLES = ["HR_ADMIN", "SUPER_ADMIN"];
const STAGES: CandidateStage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";
const miniInputClass =
  "rounded-lg border border-line bg-surface-0 px-2.5 py-2 text-xs text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

const stageSelectStyles: Record<CandidateStage, string> = {
  APPLIED: "bg-surface-2 text-ink-500",
  SCREENING: "bg-accent-soft text-accent",
  INTERVIEW: "bg-status-warn-soft text-status-warn",
  OFFER: "bg-brass-soft text-brass",
  HIRED: "bg-status-good-soft text-status-good",
  REJECTED: "bg-status-critical-soft text-status-critical",
};
const stageBarColor: Record<CandidateStage, string> = {
  APPLIED: "var(--ink-300)",
  SCREENING: "var(--accent)",
  INTERVIEW: "var(--status-warn)",
  OFFER: "var(--brass)",
  HIRED: "var(--status-good)",
  REJECTED: "var(--status-critical)",
};

const postingSchema = z.object({
  title: z.string().min(1, "Required"),
  departmentId: z.string().min(1, "Required"),
  designationId: z.string().optional(),
  description: z.string().min(3, "Tell candidates a little about the role"),
});
type PostingForm = z.infer<typeof postingSchema>;

const candidateSchema = z.object({
  fullName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});
type CandidateForm = z.infer<typeof candidateSchema>;

const interviewSchema = z.object({
  interviewerId: z.string().min(1, "Required"),
  scheduledAt: z.string().min(1, "Required"),
  mode: z.enum(["ONSITE", "VIDEO", "PHONE"]),
});
type InterviewForm = z.infer<typeof interviewSchema>;

const offerSchema = z.object({
  designationId: z.string().min(1, "Required"),
  proposedSalary: z.coerce.number().positive("Must be greater than 0"),
  joiningDate: z.string().optional(),
});
type OfferForm = z.infer<typeof offerSchema>;

async function viewOfferLetter(offerId: string): Promise<void> {
  const res = await api.get<string>(`/offers/${offerId}/letter`, { responseType: "text" });
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Offer letter</title><style>
    body{font-family:Georgia,serif;padding:48px;color:#1a1a1a;white-space:pre-wrap;line-height:1.6;max-width:640px;margin:auto;}
  </style></head><body>${escapeHtml(String(res.data))}</body></html>`);
  win.document.close();
}

export default function RecruitmentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;

  const [showPostingForm, setShowPostingForm] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [actionCandidateId, setActionCandidateId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"interview" | "offer" | null>(null);

  const postings = useQuery({ queryKey: ["job-postings"], queryFn: async () => (await api.get<JobPosting[]>("/job-postings?status=OPEN")).data });
  const departments = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get<Department[]>("/departments")).data });
  const designations = useQuery({ queryKey: ["designations"], queryFn: async () => (await api.get<Designation[]>("/designations")).data });
  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data, enabled: isAdmin });
  const candidates = useQuery({
    queryKey: ["candidates", selectedPostingId],
    queryFn: async () => (await api.get<Candidate[]>(`/candidates/job-posting/${selectedPostingId}`)).data,
    enabled: !!selectedPostingId && isAdmin,
  });

  const postingForm = useForm<PostingForm>({ resolver: zodResolver(postingSchema) });
  const candidateForm = useForm<CandidateForm>({ resolver: zodResolver(candidateSchema) });
  const interviewForm = useForm<InterviewForm>({ resolver: zodResolver(interviewSchema) });
  const offerForm = useForm<OfferForm>({ resolver: zodResolver(offerSchema) });

  const createPosting = useMutation({
    mutationFn: async (data: PostingForm) => (await api.post("/job-postings", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["job-postings"] }); postingForm.reset(); setShowPostingForm(false); toast.success(`"${variables.title}" posted`); },
    onError: (err) => toast.error("Could not post this role", extractErrorMessage(err)),
  });
  const applyCandidate = useMutation({
    mutationFn: async (data: CandidateForm) => (await api.post("/candidates", { ...data, jobPostingId: selectedPostingId })).data,
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", selectedPostingId] });
      queryClient.invalidateQueries({ queryKey: ["job-postings"] });
      candidateForm.reset();
      setShowCandidateForm(false);
      toast.success(`${variables.fullName} added to the pipeline`);
    },
    onError: (err) => toast.error("Could not add this candidate", extractErrorMessage(err)),
  });
  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: CandidateStage }) => (await api.patch(`/candidates/${id}/stage`, { stage })).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["candidates", selectedPostingId] }); toast.success(`Moved to ${variables.stage}`); },
    onError: (err) => toast.error("Could not update this candidate's stage", extractErrorMessage(err)),
  });
  const scheduleInterview = useMutation({
    mutationFn: async (data: InterviewForm & { candidateId: string }) => (await api.post("/interviews", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates", selectedPostingId] });
      interviewForm.reset();
      setActionCandidateId(null);
      setActionType(null);
      toast.success("Interview scheduled");
    },
    onError: (err) => toast.error("Could not schedule this interview", extractErrorMessage(err)),
  });
  const createOffer = useMutation({
    mutationFn: async (data: OfferForm & { candidateId: string }) => (await api.post("/offers", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates", selectedPostingId] });
      offerForm.reset();
      setActionCandidateId(null);
      setActionType(null);
      toast.success("Offer created");
    },
    onError: (err) => toast.error("Could not create this offer", extractErrorMessage(err)),
  });

  async function handleViewOfferLetter(offerId: string) {
    try {
      await viewOfferLetter(offerId);
    } catch (err) {
      toast.error("Could not load the offer letter", extractErrorMessage(err));
    }
  }

  const selectedPosting = postings.data?.find((p) => p.id === selectedPostingId);

  const allCandidatesQueries = useQueries({
    queries: (postings.data ?? []).map((p) => ({
      queryKey: ["candidates", p.id],
      queryFn: async () => (await api.get<Candidate[]>(`/candidates/job-posting/${p.id}`)).data,
      enabled: isAdmin,
    })),
  });
  const funnelCounts = useMemo(() => {
    const counts: Record<CandidateStage, number> = { APPLIED: 0, SCREENING: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0 };
    for (const q of allCandidatesQueries) {
      for (const c of q.data ?? []) counts[c.stage] += 1;
    }
    return counts;
  }, [allCandidatesQueries]);
  const funnelTotal = Math.max(1, ...Object.values(funnelCounts));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Hiring</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Recruitment</h1>
          <p className="text-sm text-ink-500 mt-2">Job postings and candidate pipeline.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowPostingForm(true)} className="inline-flex items-center gap-2 rounded-full bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-strong transition-colors shrink-0">
            <Briefcase size={15} strokeWidth={2} /> New job posting
          </button>
        )}
      </div>

      <Drawer open={showPostingForm} onClose={() => setShowPostingForm(false)} title="New job posting">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">New job posting</h2>
          <form onSubmit={postingForm.handleSubmit((data) => createPosting.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="posting-title" className="block text-xs font-medium text-ink-700 mb-1.5">Title</label>
              <input id="posting-title" {...postingForm.register("title")} placeholder="Senior Site Engineer" className={inputClass} />
              {postingForm.formState.errors.title && <p className="text-xs text-status-critical mt-1">{postingForm.formState.errors.title.message}</p>}
            </div>
            <div>
              <label htmlFor="posting-department" className="block text-xs font-medium text-ink-700 mb-1.5">Department</label>
              <select id="posting-department" {...postingForm.register("departmentId")} className={inputClass}>
                <option value="">Select…</option>
                {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {postingForm.formState.errors.departmentId && <p className="text-xs text-status-critical mt-1">{postingForm.formState.errors.departmentId.message}</p>}
            </div>
            <div>
              <label htmlFor="posting-description" className="block text-xs font-medium text-ink-700 mb-1.5">Description</label>
              <textarea id="posting-description" {...postingForm.register("description")} rows={3} className={inputClass} />
              {postingForm.formState.errors.description && <p className="text-xs text-status-critical mt-1">{postingForm.formState.errors.description.message}</p>}
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={createPosting.isPending}
              className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createPosting.isPending ? "Posting…" : "Post job"}
            </motion.button>
          </form>
        </div>
      </Drawer>

      {isAdmin && (
        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5 mb-8">
          <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">Hiring pipeline (all open postings)</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {STAGES.map((s) => (
              <div key={s} className="text-center">
                <div className="h-16 rounded-lg bg-surface-2 flex items-end overflow-hidden">
                  <div className="w-full rounded-t-lg transition-all" style={{ height: `${(funnelCounts[s] / funnelTotal) * 100}%`, background: stageBarColor[s] }} />
                </div>
                <p className="text-sm font-semibold text-ink-900 tabular-nums mt-1.5">{funnelCounts[s]}</p>
                <p className="text-[10px] text-ink-500">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface-1 shadow-card overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Title</th>
              <th className="text-left px-5 py-3 font-semibold">Department</th>
              <th className="text-left px-5 py-3 font-semibold">Candidates</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {postings.isError && (
              <tr><td colSpan={4} className="px-5 py-8"><ErrorState message="Couldn't load job postings." onRetry={() => postings.refetch()} /></td></tr>
            )}
            {!postings.isError && postings.data?.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-300">No open postings.</td></tr>
            )}
            {postings.data?.map((p) => (
              <tr
                key={p.id}
                onClick={() => isAdmin && setSelectedPostingId(p.id === selectedPostingId ? null : p.id)}
                className={`border-t border-line transition-colors ${isAdmin ? "cursor-pointer hover:bg-surface-2/60" : ""} ${selectedPostingId === p.id ? "bg-accent-soft/40" : ""}`}
              >
                <td className="px-5 py-3 font-medium text-ink-900">{p.title}</td>
                <td className="px-5 py-3 text-ink-700">{p.department?.name}</td>
                <td className="px-5 py-3 text-ink-700">{p._count?.candidates ?? 0}</td>
                <td className="px-5 py-3"><StatusPill tone="good">{p.status}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && selectedPosting && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-900">Candidates — {selectedPosting.title}</h2>
            <button onClick={() => setShowCandidateForm((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              {showCandidateForm ? <X size={13} /> : <Plus size={13} />} {showCandidateForm ? "Cancel" : "Add candidate"}
            </button>
          </div>

          <AnimatePresence>
            {showCandidateForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={candidateForm.handleSubmit((data) => applyCandidate.mutate(data))} className="overflow-hidden"
              >
                <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5 mb-4 grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="candidate-name" className="block text-xs font-medium text-ink-700 mb-1.5">Full name</label>
                    <input id="candidate-name" {...candidateForm.register("fullName")} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="candidate-email" className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
                    <input id="candidate-email" {...candidateForm.register("email")} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="candidate-phone" className="block text-xs font-medium text-ink-700 mb-1.5">Phone (optional)</label>
                    <input id="candidate-phone" {...candidateForm.register("phone")} className={inputClass} />
                  </div>
                  <div className="col-span-3">
                    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={applyCandidate.isPending}
                      className="rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:bg-accent-strong disabled:opacity-60 transition-colors">
                      {applyCandidate.isPending ? "Adding…" : "Add candidate"}
                    </motion.button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {candidates.isError && <ErrorState message="Couldn't load candidates." onRetry={() => candidates.refetch()} />}
          {!candidates.isError && candidates.data?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-ink-300">No candidates yet.</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start">
            {STAGES.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/candidate-id");
                  if (id) updateStage.mutate({ id, stage });
                }}
                className="rounded-2xl bg-surface-sunken p-2.5 min-h-[120px]"
              >
                <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageSelectStyles[stage]}`}>{stage}</span>
                  <span className="text-[11px] text-ink-300">{candidates.data?.filter((c) => c.stage === stage).length ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {candidates.data?.filter((c) => c.stage === stage).map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/candidate-id", c.id)}
                      role="group"
                      aria-label={`${c.fullName}, currently in ${stage}`}
                      className="rounded-xl border border-line bg-surface-1 shadow-card p-3 cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-7 w-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initialsFromName(c.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-ink-900 truncate">{c.fullName}</p>
                          <p className="text-[10px] text-ink-500 truncate">{c.email}</p>
                        </div>
                      </div>

                      <label className="sr-only" htmlFor={`stage-${c.id}`}>Move {c.fullName} to a different stage</label>
                      <select
                        id={`stage-${c.id}`}
                        value={c.stage}
                        onChange={(e) => updateStage.mutate({ id: c.id, stage: e.target.value as CandidateStage })}
                        className="w-full mb-1.5 rounded-lg border border-line bg-surface-0 px-1.5 py-1 text-[10px] text-ink-700 outline-none focus:border-accent"
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>

                      {c.resumeUrl && isSafeHttpUrl(c.resumeUrl) && (
                        <a href={c.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline mb-1.5">
                          <FileText size={11} strokeWidth={2} /> Resume
                        </a>
                      )}

                      {c.interviews && c.interviews.length > 0 && (
                        <div className="text-[10px] text-ink-500 mb-1.5">
                          {c.interviews.slice(-1).map((iv) => (
                            <p key={iv.id}>{new Date(iv.scheduledAt).toLocaleDateString()} · {iv.mode} · {iv.status}</p>
                          ))}
                        </div>
                      )}
                      {c.offer && (
                        <button onClick={() => handleViewOfferLetter(c.offer!.id)} className="text-[10px] font-semibold text-accent hover:underline mb-1.5 block">
                          Offer ₹{c.offer.proposedSalary.toLocaleString("en-IN")} · {c.offer.status} — view letter
                        </button>
                      )}

                      <div className="flex items-center gap-2 pt-1.5 border-t border-line mt-1.5">
                        <button onClick={() => { setActionCandidateId(c.id); setActionType(actionType === "interview" && actionCandidateId === c.id ? null : "interview"); }}
                          className="text-[10px] font-semibold text-ink-500 hover:text-ink-900 transition-colors">
                          Interview
                        </button>
                        <button onClick={() => { setActionCandidateId(c.id); setActionType(actionType === "offer" && actionCandidateId === c.id ? null : "offer"); }}
                          className="text-[10px] font-semibold text-ink-500 hover:text-ink-900 transition-colors">
                          Offer
                        </button>
                      </div>

                      {actionCandidateId === c.id && actionType === "interview" && (
                        <form
                          onSubmit={interviewForm.handleSubmit((data) => scheduleInterview.mutate({ ...data, candidateId: c.id }))}
                          className="mt-2 pt-2 border-t border-line space-y-1.5"
                        >
                          <select {...interviewForm.register("interviewerId")} className={`${miniInputClass} w-full`}>
                            <option value="">Interviewer…</option>
                            {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                          </select>
                          <input type="datetime-local" {...interviewForm.register("scheduledAt")} className={`${miniInputClass} w-full`} />
                          <select {...interviewForm.register("mode")} className={`${miniInputClass} w-full`}>
                            <option value="VIDEO">Video</option>
                            <option value="ONSITE">Onsite</option>
                            <option value="PHONE">Phone</option>
                          </select>
                          <button type="submit" disabled={scheduleInterview.isPending}
                            className="w-full rounded-lg bg-ink-900 text-surface-1 text-[11px] font-semibold px-3 py-1.5 hover:opacity-90 disabled:opacity-60 transition-opacity">
                            {scheduleInterview.isPending ? "Scheduling…" : "Confirm"}
                          </button>
                        </form>
                      )}

                      {actionCandidateId === c.id && actionType === "offer" && (
                        <form
                          onSubmit={offerForm.handleSubmit((data) => createOffer.mutate({ ...data, candidateId: c.id }))}
                          className="mt-2 pt-2 border-t border-line space-y-1.5"
                        >
                          <select {...offerForm.register("designationId")} className={`${miniInputClass} w-full`}>
                            <option value="">Designation…</option>
                            {designations.data?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                          </select>
                          <input type="number" placeholder="Salary (₹/yr)" {...offerForm.register("proposedSalary")} className={`${miniInputClass} w-full`} />
                          <input type="date" {...offerForm.register("joiningDate")} className={`${miniInputClass} w-full`} />
                          <button type="submit" disabled={createOffer.isPending}
                            className="w-full rounded-lg bg-ink-900 text-surface-1 text-[11px] font-semibold px-3 py-1.5 hover:opacity-90 disabled:opacity-60 transition-opacity">
                            {createOffer.isPending ? "Sending…" : "Create offer"}
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
