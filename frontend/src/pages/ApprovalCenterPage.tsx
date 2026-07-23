import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X as XIcon } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import { formatMoney as money } from "../utils/format";
import ErrorState from "../components/ErrorState";
import type { ExpenseClaim, LeaveRequest } from "../api/types";

export default function ApprovalCenterPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const pendingLeave = useQuery({ queryKey: ["leave-requests", "pending-approvals"], queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/pending-approvals")).data });
  const pendingExpenses = useQuery({ queryKey: ["expenses", "pending-approvals"], queryFn: async () => (await api.get<ExpenseClaim[]>("/expenses/pending-approvals")).data });

  const approveLeave = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/leave-requests/${id}/approve`, {})).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leave-requests"] }); toast.success("Leave approved"); },
    onError: (err) => toast.error("Could not approve this request", extractErrorMessage(err)),
  });
  const rejectLeave = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/leave-requests/${id}/reject`, {})).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leave-requests"] }); toast.success("Leave rejected"); },
    onError: (err) => toast.error("Could not reject this request", extractErrorMessage(err)),
  });
  const approveExpense = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/expenses/${id}/approve`, {})).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense approved"); },
    onError: (err) => toast.error("Could not approve this claim", extractErrorMessage(err)),
  });
  const rejectExpense = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/expenses/${id}/reject`, {})).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense rejected"); },
    onError: (err) => toast.error("Could not reject this claim", extractErrorMessage(err)),
  });

  const totalPending = (pendingLeave.data?.length ?? 0) + (pendingExpenses.data?.length ?? 0);
  const hasQueryError = pendingLeave.isError || pendingExpenses.isError;

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">One pane of glass</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">Approval center</h1>
        <p className="text-sm text-ink-500 mt-2">{totalPending} item{totalPending !== 1 ? "s" : ""} waiting on you.</p>
      </div>

      {hasQueryError && (
        <ErrorState
          message="Couldn't load pending approvals."
          onRetry={() => { pendingLeave.refetch(); pendingExpenses.refetch(); }}
        />
      )}

      {!hasQueryError && totalPending === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-ink-300">You&apos;re all caught up — nothing pending.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(pendingLeave.data?.length ?? 0) > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink-900 mb-3">Leave requests ({pendingLeave.data?.length})</h2>
            <div className="space-y-2">
              {pendingLeave.data?.map((r) => (
                <div key={r.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{r.employee?.firstName} {r.employee?.lastName} · {r.leaveType?.name}</p>
                    <p className="text-xs text-ink-500">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)} · {r.dayCount} day{r.dayCount !== 1 ? "s" : ""}</p>
                    {r.reason && <p className="text-xs text-ink-300 mt-0.5 truncate">{r.reason}</p>}
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

        {(pendingExpenses.data?.length ?? 0) > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink-900 mb-3">Expense claims ({pendingExpenses.data?.length})</h2>
            <div className="space-y-2">
              {pendingExpenses.data?.map((c) => (
                <div key={c.id} className="rounded-2xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{c.employee?.firstName} {c.employee?.lastName} · {c.category}</p>
                    <p className="text-xs text-ink-500">{c.expenseDate.slice(0, 10)} · {money(c.amount)}</p>
                    {c.description && <p className="text-xs text-ink-300 mt-0.5 truncate">{c.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approveExpense.mutate(c.id)} aria-label="Approve" className="h-11 w-11 rounded-full bg-status-good-soft text-status-good flex items-center justify-center hover:brightness-95 transition-all"><Check size={15} strokeWidth={2} /></button>
                    <button onClick={() => rejectExpense.mutate(c.id)} aria-label="Reject" className="h-11 w-11 rounded-full bg-status-critical-soft text-status-critical flex items-center justify-center hover:brightness-95 transition-all"><XIcon size={15} strokeWidth={2} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-300 mt-8">
        Attendance corrections, asset requests, and recruitment don&apos;t have an approval workflow in the backend yet — corrections are logged as a note only, and there&apos;s no asset or recruitment-approval entity to act on. Only Leave and Expenses are wired here for real.
      </p>
    </div>
  );
}
