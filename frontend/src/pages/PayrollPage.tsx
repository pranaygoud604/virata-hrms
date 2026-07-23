import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Download, Landmark, Plus, Printer, Settings2, Wallet } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import { formatMoney as money } from "../utils/format";
import { escapeHtml } from "../utils/html";
import Drawer from "../components/Drawer";
import ErrorState from "../components/ErrorState";
import Timeline, { type TimelineItem } from "../components/Timeline";
import type { AdHocPayComponent, AdHocPayType, BankDetail, Employee, Payslip, SalaryStructure } from "../api/types";

const FINANCE_ROLES = ["HR_ADMIN", "SUPER_ADMIN", "FINANCE"];
const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const salarySchema = z.object({
  employeeId: z.string().min(1, "Required"),
  effectiveFrom: z.string().min(1, "Required"),
  basic: z.coerce.number().positive("Must be greater than 0"),
  hra: z.coerce.number().min(0),
  specialAllowance: z.coerce.number().min(0).optional(),
});
type SalaryForm = z.infer<typeof salarySchema>;

const runSchema = z.object({ month: z.coerce.number().min(1).max(12), year: z.coerce.number().min(2000).max(2100) });
type RunForm = z.infer<typeof runSchema>;

const bankDetailSchema = z.object({
  employeeId: z.string().min(1, "Required"),
  accountHolderName: z.string().min(1, "Required"),
  accountNumber: z.string().min(6, "Too short"),
  ifscCode: z.string().min(1, "Required"),
  bankName: z.string().min(1, "Required"),
});
type BankDetailForm = z.infer<typeof bankDetailSchema>;

const adHocSchema = z.object({
  employeeId: z.string().min(1, "Required"),
  type: z.enum(["BONUS", "INCENTIVE", "DEDUCTION", "LOAN_EMI"]),
  amount: z.coerce.number().positive("Must be greater than 0"),
  description: z.string().optional(),
});
type AdHocForm = z.infer<typeof adHocSchema>;

const adHocLabels: Record<AdHocPayType, string> = { BONUS: "Bonus", INCENTIVE: "Incentive", DEDUCTION: "Deduction", LOAN_EMI: "Loan EMI" };

function printPayslip(p: Payslip, employeeName: string) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  const rows = [
    ["Basic", p.basic], ["HRA", p.hra], ["Special Allowance", p.specialAllowance], ["Overtime", p.overtimePay], ["Bonus / Incentive", p.bonusIncentive],
  ];
  const deductionRows = [
    ["Provident Fund", p.providentFund], ["ESI", p.esi], ["Professional Tax", p.professionalTax], ["TDS", p.tds], ["Other Deductions", p.otherDeductions],
  ];
  win.document.write(`<!DOCTYPE html><html><head><title>Payslip</title><style>
    body{font-family:Georgia,serif;padding:40px;color:#1a1a1a;}
    h1{font-size:20px;margin-bottom:4px;} p.sub{color:#666;margin-top:0;}
    table{width:100%;border-collapse:collapse;margin-top:16px;} td{padding:6px 0;border-bottom:1px solid #eee;font-size:14px;}
    td:last-child{text-align:right;font-variant-numeric:tabular-nums;}
    .net{font-size:22px;font-weight:bold;margin-top:20px;border-top:2px solid #1a1a1a;padding-top:12px;}
  </style></head><body>
    <h1>Virata HR — Payslip</h1>
    <p class="sub">${escapeHtml(employeeName)} · ${p.payrollRun ? `${MONTH_NAMES[p.payrollRun.month - 1]} ${p.payrollRun.year}` : ""} · ${p.paidDays}/${p.workingDays} paid days</p>
    <table><tbody>${rows.map(([l, v]) => `<tr><td>${l}</td><td>${money(v as number)}</td></tr>`).join("")}</tbody></table>
    <p style="font-weight:600;margin-top:16px;">Deductions</p>
    <table><tbody>${deductionRows.map(([l, v]) => `<tr><td>${l}</td><td>-${money(v as number)}</td></tr>`).join("")}</tbody></table>
    <p class="net">Net Pay: ${money(p.netPay)}</p>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export default function PayrollPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isFinance = user ? FINANCE_ROLES.includes(user.role) : false;
  const [drawer, setDrawer] = useState<"salary" | "run" | "bank" | "adhoc" | null>(null);
  const [lastRun, setLastRun] = useState<{ id: string; payslipCount: number } | null>(null);
  const [manageEmployeeId, setManageEmployeeId] = useState("");

  const myPayslips = useQuery({ queryKey: ["payslips", "me"], queryFn: async () => (await api.get<Payslip[]>("/payroll/payslips/me")).data });
  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data, enabled: isFinance });

  const salaryHistory = useQuery({
    queryKey: ["salary-structures", manageEmployeeId],
    queryFn: async () => (await api.get<SalaryStructure[]>(`/salary-structures/employee/${manageEmployeeId}`)).data,
    enabled: !!manageEmployeeId,
  });
  const bankDetail = useQuery({
    queryKey: ["bank-details", manageEmployeeId],
    queryFn: async () => (await api.get<BankDetail>(`/bank-details/employee/${manageEmployeeId}`)).data,
    enabled: !!manageEmployeeId,
    retry: false,
  });
  const pendingAdHoc = useQuery({
    queryKey: ["ad-hoc-pay", manageEmployeeId],
    queryFn: async () => (await api.get<AdHocPayComponent[]>(`/ad-hoc-pay/employee/${manageEmployeeId}/pending`)).data,
    enabled: !!manageEmployeeId,
  });

  const salaryForm = useForm<SalaryForm>({ resolver: zodResolver(salarySchema) });
  const runForm = useForm<RunForm>({ resolver: zodResolver(runSchema), defaultValues: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } });
  const bankForm = useForm<BankDetailForm>({ resolver: zodResolver(bankDetailSchema) });
  const adHocForm = useForm<AdHocForm>({ resolver: zodResolver(adHocSchema), defaultValues: { type: "BONUS" } });

  const setSalary = useMutation({
    mutationFn: async (data: SalaryForm) => (await api.post("/salary-structures", data)).data,
    onSuccess: () => { salaryForm.reset(); setDrawer(null); queryClient.invalidateQueries({ queryKey: ["salary-structures"] }); toast.success("Salary structure saved"); },
    onError: (err) => toast.error("Could not set the salary structure", extractErrorMessage(err)),
  });
  const processRun = useMutation({
    mutationFn: async (data: RunForm) => (await api.post("/payroll/runs/process", data)).data,
    onSuccess: (data) => {
      setLastRun({ id: data.payrollRun.id, payslipCount: data.payslipCount });
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      toast.success(`Payroll processed — ${data.payslipCount} payslip${data.payslipCount !== 1 ? "s" : ""} generated`);
    },
    onError: (err) => toast.error("Could not process payroll for that period", extractErrorMessage(err)),
  });
  const saveBankDetail = useMutation({
    mutationFn: async (data: BankDetailForm) => (await api.post("/bank-details", data)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-details"] }); bankForm.reset(); setDrawer(null); toast.success("Bank details saved"); },
    onError: (err) => toast.error("Could not save bank details", extractErrorMessage(err)),
  });
  const addAdHocPay = useMutation({
    mutationFn: async (data: AdHocForm) => (await api.post("/ad-hoc-pay", data)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ad-hoc-pay"] }); adHocForm.reset({ type: "BONUS", employeeId: manageEmployeeId }); setDrawer(null); toast.success("Added to next payroll run"); },
    onError: (err) => toast.error("Could not add this line item", extractErrorMessage(err)),
  });

  async function downloadBankFile() {
    if (!lastRun) return;
    try {
      const res = await api.get(`/payroll/runs/${lastRun.id}/bank-file`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `bank-file-${lastRun.id}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Bank file downloaded");
    } catch (err) {
      toast.error("Could not download the bank file", extractErrorMessage(err));
    }
  }

  const latest = myPayslips.data?.[0];
  const deductions = latest ? latest.providentFund + latest.esi + latest.professionalTax + latest.tds + latest.otherDeductions : 0;
  const netPct = latest && latest.grossEarnings > 0 ? (latest.netPay / latest.grossEarnings) * 100 : 0;

  const timelineItems: TimelineItem[] = (myPayslips.data ?? []).map((p) => ({
    key: p.id,
    icon: <Wallet size={15} strokeWidth={1.75} />,
    tone: "accent",
    title: p.payrollRun ? `${MONTH_NAMES[p.payrollRun.month - 1]} ${p.payrollRun.year}` : "Payslip",
    meta: (
      <span className="flex items-center gap-2">
        Net pay {money(p.netPay)} · {p.paidDays}/{p.workingDays} paid days
        <button onClick={() => printPayslip(p, user?.email ?? "Employee")} className="inline-flex items-center gap-1 text-accent hover:underline">
          <Printer size={12} strokeWidth={2} /> Print
        </button>
      </span>
    ),
  }));

  const manageEmployee = employees.data?.find((e) => e.id === manageEmployeeId);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Compensation</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Payroll</h1>
        </div>
        {isFinance && (
          <div className="flex gap-2">
            <button onClick={() => setDrawer("salary")} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-1 text-ink-700 text-sm font-semibold px-4 py-2.5 hover:bg-surface-2 transition-colors">
              <Settings2 size={15} strokeWidth={2} /> Salary structure
            </button>
            <button onClick={() => setDrawer("run")} className="inline-flex items-center gap-2 rounded-full bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong transition-colors">
              Process run
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-line bg-surface-1 shadow-card p-8 mb-8">
        {latest ? (
          <>
            <p className="text-xs text-ink-500 uppercase tracking-wide mb-1">
              Latest payslip {latest.payrollRun ? `— ${MONTH_NAMES[latest.payrollRun.month - 1]} ${latest.payrollRun.year}` : ""}
            </p>
            <p className="font-display text-5xl font-semibold text-ink-900 tabular-nums mb-6">{money(latest.netPay)}</p>
            <div className="h-3 rounded-full bg-surface-2 overflow-hidden flex mb-3">
              <div className="h-full bg-accent" style={{ width: `${netPct}%` }} />
              <div className="h-full bg-brass" style={{ width: `${100 - netPct}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Net {money(latest.netPay)}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brass" /> Deductions {money(deductions)}</span>
              <span className="text-ink-500">Gross {money(latest.grossEarnings)}</span>
              <span className="text-ink-500">{latest.paidDays}/{latest.workingDays} paid days</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-300 py-6 text-center">No payslips yet.</p>
        )}
      </div>

      <h2 className="text-sm font-semibold text-ink-900 mb-4">Payslip history</h2>
      {myPayslips.isError ? <ErrorState message="Couldn't load payslip history." onRetry={() => myPayslips.refetch()} /> : <Timeline items={timelineItems} />}

      {isFinance && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Manage compensation</h2>
          <div className="max-w-xs mb-5">
            <select value={manageEmployeeId} onChange={(e) => setManageEmployeeId(e.target.value)} className={inputClass}>
              <option value="">Select an employee…</option>
              {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>

          {manageEmployeeId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" aria-label={manageEmployee ? `${manageEmployee.firstName} ${manageEmployee.lastName}` : undefined}>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide mb-2">Salary revision history</p>
                <div className="space-y-2">
                  {salaryHistory.data?.map((s) => (
                    <div key={s.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-3">
                      <p className="text-xs text-ink-500">{new Date(s.effectiveFrom).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                      <p className="text-sm font-medium text-ink-900">{money(s.basic + s.hra + s.specialAllowance)}/mo</p>
                      <p className="text-[11px] text-ink-300">Basic {money(s.basic)} · HRA {money(s.hra)} · Special {money(s.specialAllowance)}</p>
                    </div>
                  ))}
                  {salaryHistory.data?.length === 0 && <p className="text-xs text-ink-300">No salary structure set yet.</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-ink-500 uppercase tracking-wide">Bank details</p>
                  <button onClick={() => { bankForm.reset({ employeeId: manageEmployeeId, ...bankDetail.data }); setDrawer("bank"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <Landmark size={12} strokeWidth={2} /> {bankDetail.data ? "Edit" : "Add"}
                  </button>
                </div>
                {bankDetail.data ? (
                  <div className="rounded-xl border border-line bg-surface-1 shadow-card p-3 text-sm">
                    <p className="font-medium text-ink-900">{bankDetail.data.accountHolderName}</p>
                    <p className="text-ink-500 text-xs mt-1">{bankDetail.data.bankName} · {bankDetail.data.ifscCode}</p>
                    <p className="text-ink-500 text-xs font-mono">•••• {bankDetail.data.accountNumber.slice(-4)}</p>
                  </div>
                ) : (
                  <p className="text-xs text-ink-300">No bank details on file.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-ink-500 uppercase tracking-wide">Bonus / deductions</p>
                  <button onClick={() => { adHocForm.reset({ type: "BONUS", employeeId: manageEmployeeId }); setDrawer("adhoc"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <Plus size={12} strokeWidth={2} /> Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {pendingAdHoc.data?.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs rounded-lg bg-surface-2 px-2.5 py-2">
                      <span className="text-ink-700">{adHocLabels[c.type]}{c.description ? ` — ${c.description}` : ""}</span>
                      <span className="font-semibold text-ink-900">{money(c.amount)}</span>
                    </div>
                  ))}
                  {pendingAdHoc.data?.length === 0 && <p className="text-xs text-ink-300">Nothing pending for the next payroll run.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Drawer open={drawer === "salary"} onClose={() => setDrawer(null)} title="Set salary structure">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Set salary structure</h2>
          <form onSubmit={salaryForm.handleSubmit((data) => setSalary.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="salary-employee" className="block text-xs font-medium text-ink-700 mb-1.5">Employee</label>
              <select id="salary-employee" {...salaryForm.register("employeeId")} className={inputClass}>
                <option value="">Select…</option>
                {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.employeeCode} — {e.firstName} {e.lastName}</option>)}
              </select>
              {salaryForm.formState.errors.employeeId && <p className="text-xs text-status-critical mt-1">{salaryForm.formState.errors.employeeId.message}</p>}
            </div>
            <div>
              <label htmlFor="salary-effective-from" className="block text-xs font-medium text-ink-700 mb-1.5">Effective from</label>
              <input id="salary-effective-from" type="date" {...salaryForm.register("effectiveFrom")} className={inputClass} />
              {salaryForm.formState.errors.effectiveFrom && <p className="text-xs text-status-critical mt-1">{salaryForm.formState.errors.effectiveFrom.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label htmlFor="salary-basic" className="block text-xs font-medium text-ink-700 mb-1.5">Basic</label><input id="salary-basic" type="number" {...salaryForm.register("basic")} className={inputClass} /></div>
              <div><label htmlFor="salary-hra" className="block text-xs font-medium text-ink-700 mb-1.5">HRA</label><input id="salary-hra" type="number" {...salaryForm.register("hra")} className={inputClass} /></div>
              <div><label htmlFor="salary-special" className="block text-xs font-medium text-ink-700 mb-1.5">Special</label><input id="salary-special" type="number" {...salaryForm.register("specialAllowance")} className={inputClass} /></div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={setSalary.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {setSalary.isPending ? "Saving…" : "Save structure"}
            </motion.button>
          </form>
        </div>
      </Drawer>

      <Drawer open={drawer === "run"} onClose={() => setDrawer(null)} title="Process payroll run">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Process payroll run</h2>
          <form onSubmit={runForm.handleSubmit((data) => processRun.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="run-month" className="block text-xs font-medium text-ink-700 mb-1.5">Month</label>
                <select id="run-month" {...runForm.register("month")} className={inputClass}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="run-year" className="block text-xs font-medium text-ink-700 mb-1.5">Year</label>
                <input id="run-year" type="number" {...runForm.register("year")} className={inputClass} />
                {runForm.formState.errors.year && <p className="text-xs text-status-critical mt-1">{runForm.formState.errors.year.message}</p>}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={processRun.isPending} className="w-full rounded-lg bg-ink-900 text-surface-1 text-sm font-semibold px-4 py-2.5 hover:opacity-90 disabled:opacity-60 transition-opacity">
              {processRun.isPending ? "Processing…" : "Process payroll"}
            </motion.button>
            {lastRun && (
              <div className="text-sm text-ink-700 bg-surface-sunken rounded-lg p-3 flex items-center justify-between">
                <span>{lastRun.payslipCount} payslip(s) generated.</span>
                <button type="button" onClick={downloadBankFile} className="inline-flex items-center gap-1.5 text-accent font-semibold hover:underline">
                  <Download size={14} strokeWidth={2} /> Bank file
                </button>
              </div>
            )}
          </form>
        </div>
      </Drawer>

      <Drawer open={drawer === "bank"} onClose={() => setDrawer(null)} title="Bank details">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Bank details</h2>
          <form onSubmit={bankForm.handleSubmit((data) => saveBankDetail.mutate(data))} className="space-y-4">
            <input type="hidden" {...bankForm.register("employeeId")} />
            <div>
              <label htmlFor="bank-holder-name" className="block text-xs font-medium text-ink-700 mb-1.5">Account holder name</label>
              <input id="bank-holder-name" {...bankForm.register("accountHolderName")} className={inputClass} />
              {bankForm.formState.errors.accountHolderName && <p className="text-xs text-status-critical mt-1">{bankForm.formState.errors.accountHolderName.message}</p>}
            </div>
            <div>
              <label htmlFor="bank-account-number" className="block text-xs font-medium text-ink-700 mb-1.5">Account number</label>
              <input id="bank-account-number" {...bankForm.register("accountNumber")} className={inputClass} />
              {bankForm.formState.errors.accountNumber && <p className="text-xs text-status-critical mt-1">{bankForm.formState.errors.accountNumber.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bank-ifsc" className="block text-xs font-medium text-ink-700 mb-1.5">IFSC code</label>
                <input id="bank-ifsc" {...bankForm.register("ifscCode")} className={inputClass} />
                {bankForm.formState.errors.ifscCode && <p className="text-xs text-status-critical mt-1">{bankForm.formState.errors.ifscCode.message}</p>}
              </div>
              <div>
                <label htmlFor="bank-name" className="block text-xs font-medium text-ink-700 mb-1.5">Bank name</label>
                <input id="bank-name" {...bankForm.register("bankName")} className={inputClass} />
                {bankForm.formState.errors.bankName && <p className="text-xs text-status-critical mt-1">{bankForm.formState.errors.bankName.message}</p>}
              </div>
            </div>
            <button type="submit" disabled={saveBankDetail.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {saveBankDetail.isPending ? "Saving…" : "Save bank details"}
            </button>
          </form>
        </div>
      </Drawer>

      <Drawer open={drawer === "adhoc"} onClose={() => setDrawer(null)} title="Add bonus / deduction">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add bonus / deduction</h2>
          <form onSubmit={adHocForm.handleSubmit((data) => addAdHocPay.mutate(data))} className="space-y-4">
            <input type="hidden" {...adHocForm.register("employeeId")} />
            <div>
              <label htmlFor="adhoc-type" className="block text-xs font-medium text-ink-700 mb-1.5">Type</label>
              <select id="adhoc-type" {...adHocForm.register("type")} className={inputClass}>
                {Object.entries(adHocLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="adhoc-amount" className="block text-xs font-medium text-ink-700 mb-1.5">Amount</label>
              <input id="adhoc-amount" type="number" {...adHocForm.register("amount")} className={inputClass} />
              {adHocForm.formState.errors.amount && <p className="text-xs text-status-critical mt-1">{adHocForm.formState.errors.amount.message}</p>}
            </div>
            <div>
              <label htmlFor="adhoc-description" className="block text-xs font-medium text-ink-700 mb-1.5">Description (optional)</label>
              <input id="adhoc-description" {...adHocForm.register("description")} className={inputClass} />
            </div>
            <p className="text-xs text-ink-300">Applied automatically to this employee&apos;s next processed payroll run.</p>
            <button type="submit" disabled={addAdHocPay.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {addAdHocPay.isPending ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
