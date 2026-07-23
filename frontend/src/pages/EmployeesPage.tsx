import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, CalendarClock, CalendarPlus, Download, LayoutGrid, Mail, Phone, Plus, Search, Table2, Upload } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import { downloadCsv } from "../utils/csv";
import { initials } from "../utils/format";
import Drawer from "../components/Drawer";
import Tabs from "../components/Tabs";
import Timeline from "../components/Timeline";
import ErrorState from "../components/ErrorState";
import Skeleton, { SkeletonCard } from "../components/Skeleton";
import type { AttendanceRecord, Department, Designation, Employee, LeaveType, Shift } from "../api/types";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

const employeeSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  departmentId: z.string().min(1, "Required"),
  designationId: z.string().min(1, "Required"),
  dateOfJoining: z.string().min(1, "Required"),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});
type EmployeeForm = z.infer<typeof employeeSchema>;

const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

type SortKey = "name" | "department" | "status";

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

interface ImportRow {
  raw: string[];
  firstName: string;
  lastName: string;
  departmentId?: string;
  designationId?: string;
  dateOfJoining: string;
  personalEmail?: string;
  phone?: string;
  error?: string;
}

const avatarPalette = ["bg-accent-soft text-accent", "bg-brass-soft text-brass", "bg-status-good-soft text-status-good"];

function EmployeeProfile({ employee }: { employee: Employee }) {
  const attendance = useQuery({
    queryKey: ["attendance", "employee", employee.id],
    queryFn: async () => (await api.get<AttendanceRecord[]>(`/attendance/employee/${employee.id}`)).data,
  });

  return (
    <div>
      <div className="p-8 pb-6" style={{ background: "var(--gradient-signature)" }}>
        <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur text-white flex items-center justify-center text-xl font-semibold mb-4">
          {initials(employee.firstName, employee.lastName)}
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">{employee.firstName} {employee.lastName}</h2>
        <p className="text-white/80 text-sm mt-0.5">{employee.designation?.title} · {employee.department?.name}</p>
      </div>
      <div className="px-8 pt-6">
        <Tabs
          layoutId="profile-tabs"
          tabs={[
            {
              label: "Overview",
              content: (
                <div className="space-y-4 pb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-ink-500 uppercase tracking-wide">Employee code</p>
                      <p className="text-sm font-medium text-ink-900 font-mono mt-0.5">{employee.employeeCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 uppercase tracking-wide">Status</p>
                      <p className="text-sm font-medium text-ink-900 mt-0.5">{employee.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 uppercase tracking-wide">Joined</p>
                      <p className="text-sm font-medium text-ink-900 mt-0.5">{new Date(employee.dateOfJoining).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 uppercase tracking-wide">Department</p>
                      <p className="text-sm font-medium text-ink-900 mt-0.5">{employee.department?.name}</p>
                    </div>
                  </div>
                  {(employee.personalEmail || employee.phone) && (
                    <div className="pt-4 border-t border-line space-y-2">
                      {employee.personalEmail && (
                        <p className="flex items-center gap-2 text-sm text-ink-700"><Mail size={14} strokeWidth={1.75} className="text-ink-300" /> {employee.personalEmail}</p>
                      )}
                      {employee.phone && (
                        <p className="flex items-center gap-2 text-sm text-ink-700"><Phone size={14} strokeWidth={1.75} className="text-ink-300" /> {employee.phone}</p>
                      )}
                    </div>
                  )}
                </div>
              ),
            },
            {
              label: "Attendance",
              content: (
                <div className="pb-8">
                  {attendance.isLoading && (
                    <div className="space-y-2 py-2">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  )}
                  <Timeline
                    items={(attendance.data ?? []).slice(0, 10).map((r) => ({
                      key: r.id,
                      icon: <span className="text-xs font-semibold">{r.date.slice(8, 10)}</span>,
                      tone: r.status === "PRESENT" ? "good" : r.status === "LATE" ? "warn" : r.status === "ABSENT" ? "critical" : "neutral",
                      title: `${r.status} — ${r.date.slice(0, 10)}`,
                      meta: `${r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : "—"} → ${r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : "—"}`,
                    }))}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDrawer, setBulkDrawer] = useState<"import" | "department" | "shift" | "leave" | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [bulkDepartmentId, setBulkDepartmentId] = useState("");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkLeaveTypeId, setBulkLeaveTypeId] = useState("");
  const [bulkLeaveDays, setBulkLeaveDays] = useState(12);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data });
  const departments = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get<Department[]>("/departments")).data });
  const designations = useQuery({ queryKey: ["designations"], queryFn: async () => (await api.get<Designation[]>("/designations")).data });
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: async () => (await api.get<Shift[]>("/shifts")).data, enabled: bulkDrawer === "shift" });
  const leaveTypes = useQuery({ queryKey: ["leave-types"], queryFn: async () => (await api.get<LeaveType[]>("/leave-types")).data, enabled: bulkDrawer === "leave" });

  const scoped = useMemo(
    () => (isManager ? (employees.data ?? []).filter((e) => e.managerId === user?.employeeId) : employees.data ?? []),
    [employees.data, isManager, user?.employeeId],
  );

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && employees.data) {
      const match = employees.data.find((e) => e.id === openId);
      if (match) setSelected(match);
      setSearchParams((prev) => { prev.delete("open"); return prev; }, { replace: true });
    }
  }, [searchParams, employees.data, setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || e.department?.name.toLowerCase().includes(q),
    );
  }, [scoped, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortKey === "department") return dir * (a.department?.name ?? "").localeCompare(b.department?.name ?? "");
      return dir * a.status.localeCompare(b.status);
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const rows = checkedIds.size > 0 ? sorted.filter((e) => checkedIds.has(e.id)) : sorted;
    downloadCsv("employees.csv", [
      ["Employee Code", "First Name", "Last Name", "Department", "Designation", "Status", "Date of Joining", "Email", "Phone"],
      ...rows.map((e) => [e.employeeCode, e.firstName, e.lastName, e.department?.name ?? "", e.designation?.title ?? "", e.status, e.dateOfJoining.slice(0, 10), e.personalEmail ?? "", e.phone ?? ""]),
    ]);
    toast.success(`Exported ${rows.length} employee${rows.length !== 1 ? "s" : ""}`);
  }

  const SortIcon = ({ active }: { active: boolean }) => (active ? (sortDir === "asc" ? <ArrowUp size={11} strokeWidth={2} /> : <ArrowDown size={11} strokeWidth={2} />) : null);

  function handleImportFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Not a CSV file", "Please choose a .csv file to import.");
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      toast.error("File too large", "CSV imports are limited to 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ""));
      const [header, ...dataRows] = rows;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase().replace(/\s/g, "") === name.toLowerCase());
      const iFirst = idx("firstName"), iLast = idx("lastName"), iDept = idx("department"), iDesig = idx("designation"), iJoin = idx("dateofjoining"), iEmail = idx("email"), iPhone = idx("phone");

      const parsed: ImportRow[] = dataRows.map((r) => {
        const deptName = iDept >= 0 ? r[iDept] : "";
        const desigTitle = iDesig >= 0 ? r[iDesig] : "";
        const dept = departments.data?.find((d) => d.name.toLowerCase() === deptName?.toLowerCase());
        const desig = designations.data?.find((d) => d.title.toLowerCase() === desigTitle?.toLowerCase() && d.departmentId === dept?.id);
        const firstName = iFirst >= 0 ? r[iFirst] : "";
        const lastName = iLast >= 0 ? r[iLast] : "";
        const dateOfJoining = iJoin >= 0 ? r[iJoin] : "";
        let error: string | undefined;
        if (!firstName || !lastName) error = "Missing name";
        else if (!dept) error = `Unknown department "${deptName}"`;
        else if (!desig) error = `Unknown designation "${desigTitle}"`;
        else if (!dateOfJoining) error = "Missing date of joining";
        return { raw: r, firstName, lastName, departmentId: dept?.id, designationId: desig?.id, dateOfJoining, personalEmail: iEmail >= 0 ? r[iEmail] : undefined, phone: iPhone >= 0 ? r[iPhone] : undefined, error };
      });
      setImportRows(parsed);
      setImportResult(null);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    setBulkBusy(true);
    const valid = importRows.filter((r) => !r.error);
    let success = 0, failed = 0;
    for (const row of valid) {
      try {
        await api.post("/employees", {
          firstName: row.firstName, lastName: row.lastName, departmentId: row.departmentId, designationId: row.designationId,
          dateOfJoining: row.dateOfJoining, personalEmail: row.personalEmail || undefined, phone: row.phone || undefined,
        });
        success++;
      } catch { failed++; }
    }
    failed += importRows.length - valid.length;
    setImportResult({ success, failed });
    setBulkBusy(false);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    if (failed === 0) toast.success(`Imported ${success} employee${success !== 1 ? "s" : ""}`);
    else toast.warning(`Imported ${success}, ${failed} failed`, "Check the row list for details.");
  }

  async function applyBulkDepartment() {
    if (!bulkDepartmentId) return;
    setBulkBusy(true);
    let success = 0, failed = 0;
    for (const id of checkedIds) {
      try { await api.patch(`/employees/${id}`, { departmentId: bulkDepartmentId }); success++; } catch { failed++; }
    }
    setBulkResult({ success, failed });
    setBulkBusy(false);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    if (failed === 0) toast.success(`Updated ${success} employee${success !== 1 ? "s" : ""}`);
    else toast.warning(`Updated ${success}, ${failed} failed`);
  }

  async function applyBulkShift() {
    if (!bulkShiftId) return;
    setBulkBusy(true);
    let success = 0, failed = 0;
    for (const id of checkedIds) {
      try { await api.patch(`/employees/${id}`, { shiftId: bulkShiftId }); success++; } catch { failed++; }
    }
    setBulkResult({ success, failed });
    setBulkBusy(false);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    if (failed === 0) toast.success(`Updated ${success} employee${success !== 1 ? "s" : ""}`);
    else toast.warning(`Updated ${success}, ${failed} failed`);
  }

  async function applyBulkLeaveAllocation() {
    if (!bulkLeaveTypeId) return;
    setBulkBusy(true);
    let success = 0, failed = 0;
    const year = new Date().getFullYear();
    for (const id of checkedIds) {
      try { await api.post("/leave-allocations", { employeeId: id, leaveTypeId: bulkLeaveTypeId, year, allocatedDays: bulkLeaveDays }); success++; } catch { failed++; }
    }
    setBulkResult({ success, failed });
    setBulkBusy(false);
    if (failed === 0) toast.success(`Allocated leave for ${success} employee${success !== 1 ? "s" : ""}`);
    else toast.warning(`Allocated ${success}, ${failed} failed`);
  }

  function closeBulkDrawer() {
    setBulkDrawer(null);
    setImportRows([]);
    setImportResult(null);
    setBulkResult(null);
    setBulkDepartmentId("");
    setBulkShiftId("");
    setBulkLeaveTypeId("");
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeForm>({ resolver: zodResolver(employeeSchema) });

  const createEmployee = useMutation({
    mutationFn: async (data: EmployeeForm) => (await api.post("/employees", { ...data, personalEmail: data.personalEmail || undefined })).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      reset();
      setShowCreate(false);
      toast.success(`${variables.firstName} ${variables.lastName} added`);
    },
    onError: (err) => toast.error("Could not create employee", extractErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">{isManager ? "My team" : "People"}</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">{isManager ? "Your direct reports" : "Everyone at Virata"}</h1>
          <p className="text-sm text-ink-500 mt-2">
            {isManager ? `${scoped.length} people reporting to you.` : `${employees.data?.length ?? 0} people across the organization.`}
          </p>
        </div>
        {!isManager && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setBulkDrawer("import")} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1 text-ink-700 text-sm font-semibold px-4 py-2.5 hover:bg-surface-2 transition-colors">
              <Upload size={14} strokeWidth={2} /> Import CSV
            </button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-full bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-strong transition-colors">
              <Plus size={15} strokeWidth={2.5} /> Add person
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…"
            className="w-full rounded-full border border-line bg-surface-1 pl-9 pr-3 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {checkedIds.size > 0 && (
            <>
              <span className="text-xs text-ink-500">{checkedIds.size} selected</span>
              {!isManager && (
                <>
                  <button onClick={() => setBulkDrawer("department")} className="rounded-full border border-line bg-surface-1 text-ink-700 text-xs font-semibold px-3 py-2 hover:bg-surface-2 transition-colors">Change department</button>
                  <button onClick={() => setBulkDrawer("shift")} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-1 text-ink-700 text-xs font-semibold px-3 py-2 hover:bg-surface-2 transition-colors"><CalendarClock size={12} strokeWidth={2} /> Change shift</button>
                  <button onClick={() => setBulkDrawer("leave")} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-1 text-ink-700 text-xs font-semibold px-3 py-2 hover:bg-surface-2 transition-colors"><CalendarPlus size={12} strokeWidth={2} /> Allocate leave</button>
                </>
              )}
            </>
          )}
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1 text-ink-700 text-xs font-semibold px-3.5 py-2 hover:bg-surface-2 transition-colors">
            <Download size={13} strokeWidth={2} /> Export {checkedIds.size > 0 ? "selected" : "all"}
          </button>
          <div className="flex rounded-full border border-line bg-surface-1 p-0.5">
            <button onClick={() => setView("cards")} aria-label="Card view" className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${view === "cards" ? "bg-accent-soft text-accent" : "text-ink-500 hover:text-ink-900"}`}>
              <LayoutGrid size={14} strokeWidth={1.75} />
            </button>
            <button onClick={() => setView("table")} aria-label="Table view" className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${view === "table" ? "bg-accent-soft text-accent" : "text-ink-500 hover:text-ink-900"}`}>
              <Table2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {employees.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {employees.isError && <ErrorState message="Couldn't load employees." onRetry={() => employees.refetch()} />}
      {!employees.isLoading && !employees.isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-300">
          {search ? "No one matches your search." : isManager ? "No one reports to you yet." : "No one here yet."}
        </div>
      )}

      {view === "table" && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line mb-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-ink-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 w-8">
                  <input type="checkbox" checked={checkedIds.size === sorted.length} onChange={(e) => setCheckedIds(e.target.checked ? new Set(sorted.map((s) => s.id)) : new Set())} className="h-3.5 w-3.5" />
                </th>
                <th className="text-left px-2 py-2.5 font-medium cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">Name <SortIcon active={sortKey === "name"} /></span>
                </th>
                <th className="text-left px-2 py-2.5 font-medium cursor-pointer select-none" onClick={() => toggleSort("department")}>
                  <span className="inline-flex items-center gap-1">Department <SortIcon active={sortKey === "department"} /></span>
                </th>
                <th className="text-left px-2 py-2.5 font-medium">Designation</th>
                <th className="text-left px-2 py-2.5 font-medium cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="inline-flex items-center gap-1">Status <SortIcon active={sortKey === "status"} /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((emp) => (
                <tr key={emp.id} className="border-t border-line hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={checkedIds.has(emp.id)} onChange={() => toggleChecked(emp.id)} className="h-3.5 w-3.5" />
                  </td>
                  <td className="px-2 py-2.5 text-ink-900 font-medium cursor-pointer" onClick={() => setSelected(emp)}>{emp.firstName} {emp.lastName} <span className="text-ink-300 font-mono text-xs">{emp.employeeCode}</span></td>
                  <td className="px-2 py-2.5 text-ink-700">{emp.department?.name}</td>
                  <td className="px-2 py-2.5 text-ink-700">{emp.designation?.title}</td>
                  <td className="px-2 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${emp.status === "ACTIVE" ? "bg-status-good-soft text-status-good" : "bg-surface-2 text-ink-500"}`}>{emp.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "cards" && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((emp, i) => (
          <motion.button
            key={emp.id}
            onClick={() => setSelected(emp)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.25 }}
            whileHover={{ y: -3 }}
            className="text-left rounded-2xl border border-line bg-surface-1 shadow-card hover:shadow-card-hover p-5 transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarPalette[i % avatarPalette.length]}`}>
                {initials(emp.firstName, emp.lastName)}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-ink-900 truncate">{emp.firstName} {emp.lastName}</p>
                <p className="text-xs text-ink-500 truncate">{emp.designation?.title}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-500">{emp.department?.name}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${emp.status === "ACTIVE" ? "bg-status-good-soft text-status-good" : "bg-surface-2 text-ink-500"}`}>
                {emp.status}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} width={440} title={selected ? `${selected.firstName} ${selected.lastName}` : undefined}>
        {selected && <EmployeeProfile employee={selected} />}
      </Drawer>

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} width={440} title="Add a person">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add a person</h2>
          <form onSubmit={handleSubmit((data) => createEmployee.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="emp-first-name" className="block text-xs font-medium text-ink-700 mb-1.5">First name</label>
                <input id="emp-first-name" {...register("firstName")} className={inputClass} />
                {errors.firstName && <p className="text-xs text-status-critical mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label htmlFor="emp-last-name" className="block text-xs font-medium text-ink-700 mb-1.5">Last name</label>
                <input id="emp-last-name" {...register("lastName")} className={inputClass} />
                {errors.lastName && <p className="text-xs text-status-critical mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="emp-department" className="block text-xs font-medium text-ink-700 mb-1.5">Department</label>
              <select id="emp-department" {...register("departmentId")} className={inputClass}>
                <option value="">Select…</option>
                {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className="text-xs text-status-critical mt-1">{errors.departmentId.message}</p>}
            </div>
            <div>
              <label htmlFor="emp-designation" className="block text-xs font-medium text-ink-700 mb-1.5">Designation</label>
              <select id="emp-designation" {...register("designationId")} className={inputClass}>
                <option value="">Select…</option>
                {designations.data?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              {errors.designationId && <p className="text-xs text-status-critical mt-1">{errors.designationId.message}</p>}
            </div>
            <div>
              <label htmlFor="emp-doj" className="block text-xs font-medium text-ink-700 mb-1.5">Date of joining</label>
              <input id="emp-doj" type="date" {...register("dateOfJoining")} className={inputClass} />
              {errors.dateOfJoining && <p className="text-xs text-status-critical mt-1">{errors.dateOfJoining.message}</p>}
            </div>
            <div>
              <label htmlFor="emp-personal-email" className="block text-xs font-medium text-ink-700 mb-1.5">Personal email (optional)</label>
              <input id="emp-personal-email" {...register("personalEmail")} className={inputClass} />
              {errors.personalEmail && <p className="text-xs text-status-critical mt-1">{errors.personalEmail.message}</p>}
            </div>
            {createEmployee.isError && <p className="text-sm text-status-critical">Could not create employee — check the fields and try again.</p>}
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={createEmployee.isPending}
              className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createEmployee.isPending ? "Creating…" : "Create employee"}
            </motion.button>
          </form>
        </div>
      </Drawer>

      <Drawer open={bulkDrawer === "import"} onClose={closeBulkDrawer} width={520} title="Import employees">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Import employees</h2>
          <p className="text-sm text-ink-500 mb-6">CSV columns: <code className="text-xs">firstName, lastName, department, designation, dateOfJoining, email, phone</code>. Department/designation must match existing names exactly.</p>
          <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} className="text-sm mb-4" />
          {importRows.length > 0 && !importResult && (
            <>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-line mb-4">
                <table className="w-full text-xs">
                  <tbody>
                    {importRows.map((r, i) => (
                      <tr key={i} className={`border-t border-line first:border-t-0 ${r.error ? "bg-status-critical-soft/40" : ""}`}>
                        <td className="px-3 py-2">{r.firstName} {r.lastName}</td>
                        <td className="px-3 py-2 text-ink-500">{r.error ? <span className="text-status-critical">{r.error}</span> : "Ready"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-500 mb-3">{importRows.filter((r) => !r.error).length} of {importRows.length} rows ready to import.</p>
              <button onClick={runImport} disabled={bulkBusy || importRows.every((r) => r.error)} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
                {bulkBusy ? "Importing…" : `Import ${importRows.filter((r) => !r.error).length} employees`}
              </button>
            </>
          )}
          {importResult && (
            <div className="rounded-xl bg-surface-2 p-4 text-sm text-ink-700">
              {importResult.success} created successfully{importResult.failed > 0 ? `, ${importResult.failed} failed` : ""}.
            </div>
          )}
        </div>
      </Drawer>

      <Drawer open={bulkDrawer === "department"} onClose={closeBulkDrawer} title="Change department">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Change department</h2>
          <p className="text-sm text-ink-500 mb-6">Applies to {checkedIds.size} selected employee{checkedIds.size !== 1 ? "s" : ""}.</p>
          <select value={bulkDepartmentId} onChange={(e) => setBulkDepartmentId(e.target.value)} className={`${inputClass} mb-4`}>
            <option value="">Select department…</option>
            {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {bulkResult && <p className="text-sm text-ink-700 mb-3">{bulkResult.success} updated{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ""}.</p>}
          <button onClick={applyBulkDepartment} disabled={bulkBusy || !bulkDepartmentId} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
            {bulkBusy ? "Applying…" : "Apply to selected"}
          </button>
        </div>
      </Drawer>

      <Drawer open={bulkDrawer === "shift"} onClose={closeBulkDrawer} title="Change shift">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Change shift</h2>
          <p className="text-sm text-ink-500 mb-6">Applies to {checkedIds.size} selected employee{checkedIds.size !== 1 ? "s" : ""}.</p>
          <select value={bulkShiftId} onChange={(e) => setBulkShiftId(e.target.value)} className={`${inputClass} mb-4`}>
            <option value="">Select shift…</option>
            {shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
          </select>
          {bulkResult && <p className="text-sm text-ink-700 mb-3">{bulkResult.success} updated{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ""}.</p>}
          <button onClick={applyBulkShift} disabled={bulkBusy || !bulkShiftId} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
            {bulkBusy ? "Applying…" : "Apply to selected"}
          </button>
        </div>
      </Drawer>

      <Drawer open={bulkDrawer === "leave"} onClose={closeBulkDrawer} title="Allocate leave">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Allocate leave</h2>
          <p className="text-sm text-ink-500 mb-6">Grants {new Date().getFullYear()} leave to {checkedIds.size} selected employee{checkedIds.size !== 1 ? "s" : ""}.</p>
          <div className="space-y-3 mb-4">
            <select value={bulkLeaveTypeId} onChange={(e) => setBulkLeaveTypeId(e.target.value)} className={inputClass}>
              <option value="">Select leave type…</option>
              {leaveTypes.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div>
              <label htmlFor="bulk-leave-days" className="block text-xs font-medium text-ink-700 mb-1.5">Days allocated</label>
              <input id="bulk-leave-days" type="number" value={bulkLeaveDays} onChange={(e) => setBulkLeaveDays(Number(e.target.value))} className={inputClass} />
            </div>
          </div>
          {bulkResult && <p className="text-sm text-ink-700 mb-3">{bulkResult.success} allocated{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ""}.</p>}
          <button onClick={applyBulkLeaveAllocation} disabled={bulkBusy || !bulkLeaveTypeId} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
            {bulkBusy ? "Applying…" : "Apply to selected"}
          </button>
        </div>
      </Drawer>
    </div>
  );
}
