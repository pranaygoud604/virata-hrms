import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Check, ImageOff, Plus, Receipt, Trash2, X as XIcon } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { extractErrorMessage } from "../utils/apiError";
import { formatMoney as money } from "../utils/format";
import { isSafeHttpUrl } from "../utils/html";
import Drawer from "../components/Drawer";
import ErrorState from "../components/ErrorState";
import Timeline, { type TimelineItem } from "../components/Timeline";
import type { ExpenseClaim } from "../api/types";

const APPROVER_ROLES = ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"];
const FINANCE_ROLES = ["HR_ADMIN", "SUPER_ADMIN", "FINANCE"];
const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

const claimSchema = z.object({
  category: z.string().min(1, "Required"),
  amount: z.coerce.number().positive("Must be greater than 0"),
  expenseDate: z.string().min(1, "Required"),
  description: z.string().optional(),
  receiptUrls: z.array(z.object({ url: z.string().url("Must be a valid URL").refine(isSafeHttpUrl, "Must be an http(s) URL") })).optional(),
});
type ClaimForm = z.infer<typeof claimSchema>;

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url);
}

function ReceiptThumb({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  if (!isSafeHttpUrl(url)) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block h-16 w-16 rounded-lg border border-line bg-surface-2 overflow-hidden shrink-0 flex items-center justify-center">
      {isImageUrl(url) && !broken ? (
        <img src={url} alt="Receipt" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <ImageOff size={16} strokeWidth={1.75} className="text-ink-300" />
      )}
    </a>
  );
}

const statusTone = { PENDING: "warn", APPROVED: "accent", REJECTED: "critical", REIMBURSED: "good" } as const;

export default function ExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const isApprover = user ? APPROVER_ROLES.includes(user.role) : false;
  const isFinance = user ? FINANCE_ROLES.includes(user.role) : false;

  const myClaims = useQuery({ queryKey: ["expenses", "me"], queryFn: async () => (await api.get<ExpenseClaim[]>("/expenses/me")).data });
  const pendingApprovals = useQuery({
    queryKey: ["expenses", "pending-approvals"],
    queryFn: async () => (await api.get<ExpenseClaim[]>("/expenses/pending-approvals")).data,
    enabled: isApprover,
  });

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<ClaimForm>({ resolver: zodResolver(claimSchema), defaultValues: { receiptUrls: [] } });
  const { fields: receiptFields, append: appendReceipt, remove: removeReceipt } = useFieldArray({ control, name: "receiptUrls" });

  function invalidateExpenses() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }
  const submitClaim = useMutation({
    mutationFn: async (data: ClaimForm) => {
      const payload = {
        category: data.category, amount: data.amount, expenseDate: data.expenseDate, description: data.description || undefined,
        receiptUrls: data.receiptUrls?.length ? data.receiptUrls.map((r) => r.url) : undefined,
      };
      return (await api.post("/expenses", payload)).data;
    },
    onSuccess: () => { invalidateExpenses(); reset({ receiptUrls: [] }); setShowForm(false); toast.success("Claim submitted"); },
    onError: (err) => toast.error("Could not submit the claim", extractErrorMessage(err)),
  });
  const approveClaim = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/expenses/${id}/approve`, {})).data,
    onSuccess: () => { invalidateExpenses(); toast.success("Claim approved"); },
    onError: (err) => toast.error("Could not approve this claim", extractErrorMessage(err)),
  });
  const rejectClaim = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/expenses/${id}/reject`, {})).data,
    onSuccess: () => { invalidateExpenses(); toast.success("Claim rejected"); },
    onError: (err) => toast.error("Could not reject this claim", extractErrorMessage(err)),
  });
  const reimburseClaim = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/expenses/${id}/reimburse`, {})).data,
    onSuccess: () => { invalidateExpenses(); toast.success("Marked as reimbursed"); },
    onError: (err) => toast.error("Could not mark this as reimbursed", extractErrorMessage(err)),
  });

  async function handleRemoveReceipt(index: number, hasValue: boolean) {
    if (hasValue) {
      const ok = await confirm({ title: "Remove this receipt?", confirmLabel: "Remove", tone: "danger" });
      if (!ok) return;
    }
    removeReceipt(index);
  }

  const reimbursable = myClaims.data?.filter((c) => c.status === "APPROVED") ?? [];

  const totals = useMemo(() => {
    const claims = myClaims.data ?? [];
    return {
      pending: claims.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0),
      reimbursed: claims.filter((c) => c.status === "REIMBURSED").reduce((s, c) => s + c.amount, 0),
    };
  }, [myClaims.data]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of myClaims.data ?? []) map.set(c.category, (map.get(c.category) ?? 0) + c.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [myClaims.data]);
  const categoryMax = Math.max(1, ...categoryTotals.map(([, v]) => v));

  const monthlyTotals = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), total: 0 };
    });
    for (const c of myClaims.data ?? []) {
      const d = new Date(c.expenseDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.total += c.amount;
    }
    return months;
  }, [myClaims.data]);
  const monthlyMax = Math.max(1, ...monthlyTotals.map((m) => m.total));

  const timelineItems: TimelineItem[] = (myClaims.data ?? []).map((c) => ({
    key: c.id,
    icon: <Receipt size={15} strokeWidth={1.75} />,
    tone: statusTone[c.status],
    title: `${c.category} · ${money(c.amount)}`,
    meta: (
      <div>
        <span>{c.expenseDate.slice(0, 10)} · {c.status}</span>
        {c.receipts.length > 0 && (
          <div className="flex gap-1.5 mt-1.5">
            {c.receipts.map((r) => <ReceiptThumb key={r.id} url={r.fileUrl} />)}
          </div>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Reimbursement</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Expenses</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-strong transition-colors">
          <Receipt size={15} strokeWidth={2} /> Submit claim
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
            <p className="text-xs text-ink-500 uppercase tracking-wide">Awaiting decision</p>
            <p className="font-display text-2xl font-semibold text-status-warn tabular-nums mt-1">{money(totals.pending)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
            <p className="text-xs text-ink-500 uppercase tracking-wide">Reimbursed to date</p>
            <p className="font-display text-2xl font-semibold text-status-good tabular-nums mt-1">{money(totals.reimbursed)}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-line bg-surface-1 shadow-card p-5">
            <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">By category</p>
            {categoryTotals.length === 0 ? <p className="text-xs text-ink-300">No claims yet.</p> : (
              <div className="space-y-2">
                {categoryTotals.map(([cat, val]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-ink-500 truncate shrink-0">{cat}</span>
                    <div className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${(val / categoryMax) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-ink-900 tabular-nums w-20 text-right">{money(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wide mb-4">Monthly trend</p>
          <div className="flex items-end gap-3 h-32">
            {monthlyTotals.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <div className="w-full rounded-t-lg bg-brass transition-all" style={{ height: `${(m.total / monthlyMax) * 100}%`, minHeight: m.total > 0 ? 4 : 0 }} />
                </div>
                <span className="text-[10px] text-ink-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isApprover && (pendingApprovals.data?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Pending your approval</h2>
          <div className="space-y-2">
            {pendingApprovals.data?.map((c) => (
              <div key={c.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{c.employee?.firstName} {c.employee?.lastName} · {c.category}</p>
                  <p className="text-xs text-ink-500">{c.expenseDate.slice(0, 10)} · {money(c.amount)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approveClaim.mutate(c.id)} aria-label="Approve" className="h-11 w-11 rounded-full bg-status-good-soft text-status-good flex items-center justify-center hover:brightness-95 transition-all"><Check size={15} strokeWidth={2} /></button>
                  <button onClick={() => rejectClaim.mutate(c.id)} aria-label="Reject" className="h-11 w-11 rounded-full bg-status-critical-soft text-status-critical flex items-center justify-center hover:brightness-95 transition-all"><XIcon size={15} strokeWidth={2} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isFinance && reimbursable.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Approved — ready to reimburse</h2>
          <div className="rounded-2xl border border-line bg-surface-1 shadow-card divide-y divide-line overflow-hidden">
            {reimbursable.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-ink-700">{c.category}</span>
                <div className="flex items-center gap-4">
                  <span className="text-ink-900 font-medium tabular-nums">{money(c.amount)}</span>
                  <button onClick={() => reimburseClaim.mutate(c.id)} className="rounded-full bg-ink-900 text-surface-1 text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity">
                    Mark reimbursed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-ink-900 mb-4">My claims</h2>
      {myClaims.isError ? <ErrorState message="Couldn't load your claims." onRetry={() => myClaims.refetch()} /> : <Timeline items={timelineItems} />}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Submit a claim">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Submit a claim</h2>
          <form onSubmit={handleSubmit((data) => submitClaim.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="expense-category" className="block text-xs font-medium text-ink-700 mb-1.5">Category</label>
              <input id="expense-category" {...register("category")} placeholder="Travel, Meals, Supplies…" className={inputClass} />
              {errors.category && <p className="text-xs text-status-critical mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label htmlFor="expense-amount" className="block text-xs font-medium text-ink-700 mb-1.5">Amount (₹)</label>
              <input id="expense-amount" type="number" step="0.01" {...register("amount")} className={inputClass} />
              {errors.amount && <p className="text-xs text-status-critical mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label htmlFor="expense-date" className="block text-xs font-medium text-ink-700 mb-1.5">Expense date</label>
              <input id="expense-date" type="date" {...register("expenseDate")} className={inputClass} />
              {errors.expenseDate && <p className="text-xs text-status-critical mt-1">{errors.expenseDate.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="block text-xs font-medium text-ink-700">Receipts (optional)</span>
                <button type="button" onClick={() => appendReceipt({ url: "" })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  <Plus size={12} strokeWidth={2} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {receiptFields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input {...register(`receiptUrls.${i}.url` as const)} aria-label={`Receipt ${i + 1} URL`} placeholder="https://…" className={inputClass} />
                    <button type="button" onClick={() => handleRemoveReceipt(i, !!watch(`receiptUrls.${i}.url`))} aria-label="Remove receipt" className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-ink-300 hover:text-status-critical transition-colors"><Trash2 size={15} strokeWidth={1.75} /></button>
                  </div>
                ))}
                {receiptFields.map((field, i) => {
                  const message = errors.receiptUrls?.[i]?.url?.message;
                  return message ? <p key={field.id} className="text-xs text-status-critical">{message}</p> : null;
                })}
              </div>
            </div>
            <div>
              <label htmlFor="expense-description" className="block text-xs font-medium text-ink-700 mb-1.5">Description (optional)</label>
              <textarea id="expense-description" {...register("description")} rows={3} className={inputClass} />
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={submitClaim.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {submitClaim.isPending ? "Submitting…" : "Submit claim"}
            </motion.button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
