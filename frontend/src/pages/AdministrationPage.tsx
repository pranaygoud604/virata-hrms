import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, CalendarDays, MapPin, PartyPopper, Plus, ScrollText, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { extractErrorMessage } from "../utils/apiError";
import Drawer from "../components/Drawer";
import Tabs from "../components/Tabs";
import { getNavItems } from "../config/navigation";
import type { Department, Designation, GeoFenceLocation, Holiday, LeaveType, Role, Shift } from "../api/types";

const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

const departmentSchema = z.object({ name: z.string().min(1, "Required") });
type DepartmentForm = z.infer<typeof departmentSchema>;

const designationSchema = z.object({ title: z.string().min(1, "Required"), departmentId: z.string().min(1, "Required") });
type DesignationForm = z.infer<typeof designationSchema>;

const geofenceSchema = z.object({
  name: z.string().min(1, "Required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(20).max(5000).optional(),
});
type GeofenceForm = z.infer<typeof geofenceSchema>;

const ALL_ROLES: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "FINANCE", "EMPLOYEE"];

function DepartmentsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const departments = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get<Department[]>("/departments")).data });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DepartmentForm>({ resolver: zodResolver(departmentSchema) });
  const create = useMutation({
    mutationFn: async (data: DepartmentForm) => (await api.post("/departments", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["departments"] }); reset(); setShowForm(false); toast.success(`"${variables.name}" added`); },
    onError: (err) => toast.error("Could not create this department", extractErrorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/departments/${id}`)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department deleted"); },
    onError: (err) => toast.error("Could not delete this department", extractErrorMessage(err)),
  });

  async function handleRemove(d: Department) {
    const ok = await confirm({
      title: `Delete "${d.name}"?`,
      description: "This can't be undone. Employees and designations linked to this department may be affected.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) remove.mutate(d.id);
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"><Plus size={13} strokeWidth={2} /> Add department</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.data?.map((d) => (
          <div key={d.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-900">{d.name}</span>
            <button onClick={() => handleRemove(d)} aria-label={`Delete ${d.name}`} className="h-11 w-11 -my-2 -mr-2 rounded-full flex items-center justify-center shrink-0 text-ink-300 hover:text-status-critical transition-colors"><Trash2 size={14} strokeWidth={1.75} /></button>
          </div>
        ))}
      </div>
      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Add a department">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add a department</h2>
          <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="dept-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
              <input id="dept-name" {...register("name")} className={inputClass} />
              {errors.name && <p className="text-xs text-status-critical mt-1">{errors.name.message}</p>}
            </div>
            <button type="submit" disabled={create.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {create.isPending ? "Adding…" : "Add department"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}

function DesignationsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const departments = useQuery({ queryKey: ["departments"], queryFn: async () => (await api.get<Department[]>("/departments")).data });
  const designations = useQuery({ queryKey: ["designations"], queryFn: async () => (await api.get<Designation[]>("/designations")).data });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DesignationForm>({ resolver: zodResolver(designationSchema) });
  const create = useMutation({
    mutationFn: async (data: DesignationForm) => (await api.post("/designations", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["designations"] }); reset(); setShowForm(false); toast.success(`"${variables.title}" added`); },
    onError: (err) => toast.error("Could not create this designation", extractErrorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/designations/${id}`)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["designations"] }); toast.success("Designation deleted"); },
    onError: (err) => toast.error("Could not delete this designation", extractErrorMessage(err)),
  });

  async function handleRemove(d: Designation) {
    const ok = await confirm({
      title: `Delete "${d.title}"?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) remove.mutate(d.id);
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"><Plus size={13} strokeWidth={2} /> Add designation</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {designations.data?.map((d) => (
          <div key={d.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink-900">{d.title}</p>
              <p className="text-xs text-ink-500">{departments.data?.find((dep) => dep.id === d.departmentId)?.name}</p>
            </div>
            <button onClick={() => handleRemove(d)} aria-label={`Delete ${d.title}`} className="h-11 w-11 -my-2 -mr-2 rounded-full flex items-center justify-center shrink-0 text-ink-300 hover:text-status-critical transition-colors"><Trash2 size={14} strokeWidth={1.75} /></button>
          </div>
        ))}
      </div>
      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Add a designation">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add a designation</h2>
          <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="desig-title" className="block text-xs font-medium text-ink-700 mb-1.5">Title</label>
              <input id="desig-title" {...register("title")} className={inputClass} />
              {errors.title && <p className="text-xs text-status-critical mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label htmlFor="desig-department" className="block text-xs font-medium text-ink-700 mb-1.5">Department</label>
              <select id="desig-department" {...register("departmentId")} className={inputClass}>
                <option value="">Select…</option>
                {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className="text-xs text-status-critical mt-1">{errors.departmentId.message}</p>}
            </div>
            <button type="submit" disabled={create.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {create.isPending ? "Adding…" : "Add designation"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}

function GeofenceTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const locations = useQuery({ queryKey: ["geofence-locations"], queryFn: async () => (await api.get<GeoFenceLocation[]>("/geofence-locations")).data });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GeofenceForm>({ resolver: zodResolver(geofenceSchema) });
  const create = useMutation({
    mutationFn: async (data: GeofenceForm) => (await api.post("/geofence-locations", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["geofence-locations"] }); reset(); setShowForm(false); toast.success(`"${variables.name}" added`); },
    onError: (err) => toast.error("Could not add this location", extractErrorMessage(err)),
  });
  const deactivate = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/geofence-locations/${id}/deactivate`)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["geofence-locations"] }); toast.success("Location deactivated"); },
    onError: (err) => toast.error("Could not deactivate this location", extractErrorMessage(err)),
  });

  async function handleDeactivate(g: GeoFenceLocation) {
    const ok = await confirm({
      title: `Deactivate "${g.name}"?`,
      description: "Employees will no longer be able to check in against this site's geofence.",
      confirmLabel: "Deactivate",
      tone: "danger",
    });
    if (ok) deactivate.mutate(g.id);
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"><Plus size={13} strokeWidth={2} /> Add site</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {locations.data?.map((g) => (
          <div key={g.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-4">
            <div className="flex items-start justify-between mb-1">
              <span className="h-8 w-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0"><MapPin size={14} strokeWidth={1.75} /></span>
              {g.isActive ? (
                <button onClick={() => handleDeactivate(g)} className="text-[11px] font-semibold text-status-critical hover:underline">Deactivate</button>
              ) : (
                <span className="text-[11px] font-medium text-ink-300">Inactive</span>
              )}
            </div>
            <p className="text-sm font-medium text-ink-900 mt-2">{g.name}</p>
            <p className="text-xs text-ink-500">{g.latitude.toFixed(4)}, {g.longitude.toFixed(4)} · {g.radiusMeters}m radius</p>
          </div>
        ))}
      </div>
      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Add an office location">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add an office location</h2>
          <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="geo-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
              <input id="geo-name" {...register("name")} placeholder="Head Office — Banjara Hills" className={inputClass} />
              {errors.name && <p className="text-xs text-status-critical mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="geo-latitude" className="block text-xs font-medium text-ink-700 mb-1.5">Latitude</label>
                <input id="geo-latitude" type="number" step="0.0001" {...register("latitude")} className={inputClass} />
                {errors.latitude && <p className="text-xs text-status-critical mt-1">{errors.latitude.message}</p>}
              </div>
              <div>
                <label htmlFor="geo-longitude" className="block text-xs font-medium text-ink-700 mb-1.5">Longitude</label>
                <input id="geo-longitude" type="number" step="0.0001" {...register("longitude")} className={inputClass} />
                {errors.longitude && <p className="text-xs text-status-critical mt-1">{errors.longitude.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="geo-radius" className="block text-xs font-medium text-ink-700 mb-1.5">Radius (meters, default 200)</label>
              <input id="geo-radius" type="number" {...register("radiusMeters")} className={inputClass} />
              {errors.radiusMeters && <p className="text-xs text-status-critical mt-1">{errors.radiusMeters.message}</p>}
            </div>
            <button type="submit" disabled={create.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {create.isPending ? "Adding…" : "Add location"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}

function PoliciesTab() {
  const leaveTypes = useQuery({ queryKey: ["leave-types"], queryFn: async () => (await api.get<LeaveType[]>("/leave-types")).data });
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: async () => (await api.get<Shift[]>("/shifts")).data });
  const holidays = useQuery({ queryKey: ["holidays"], queryFn: async () => (await api.get<Holiday[]>(`/holidays?year=${new Date().getFullYear()}`)).data });

  return (
    <div>
      <p className="text-xs text-ink-300 mb-5">
        A single overview of every configurable policy. Attendance geofence-enforcement and payroll tax rates are hardcoded backend constants with no settings API — they can&apos;t be edited from here without a backend change.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink-900 flex items-center gap-1.5"><CalendarDays size={14} strokeWidth={1.75} /> Leave policies</p>
            <Link to="/leave" className="text-xs font-semibold text-accent hover:underline">Manage →</Link>
          </div>
          <div className="space-y-2">
            {leaveTypes.data?.map((t) => (
              <div key={t.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-3">
                <p className="text-sm font-medium text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-500">{t.defaultAnnualDays} days/year · {t.carryForwardAllowed ? "carry-forward" : "no carry-forward"} · {t.isPaid ? "paid" : "unpaid"}</p>
              </div>
            ))}
            {leaveTypes.data?.length === 0 && <p className="text-xs text-ink-300">None configured.</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink-900 flex items-center gap-1.5"><CalendarClock size={14} strokeWidth={1.75} /> Shift policies</p>
            <Link to="/shifts-holidays" className="text-xs font-semibold text-accent hover:underline">Manage →</Link>
          </div>
          <div className="space-y-2">
            {shifts.data?.map((s) => (
              <div key={s.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-3">
                <p className="text-sm font-medium text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-500">{s.startTime}–{s.endTime} · {s.gracePeriodMinutes}min grace{s.isNightShift ? " · night shift" : ""}</p>
              </div>
            ))}
            {shifts.data?.length === 0 && <p className="text-xs text-ink-300">None configured.</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink-900 flex items-center gap-1.5"><PartyPopper size={14} strokeWidth={1.75} /> Holiday policy ({new Date().getFullYear()})</p>
            <Link to="/shifts-holidays" className="text-xs font-semibold text-accent hover:underline">Manage →</Link>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {holidays.data?.map((h) => (
              <div key={h.id} className="rounded-xl border border-line bg-surface-1 shadow-card p-3 flex items-center justify-between">
                <p className="text-sm text-ink-900">{h.name}</p>
                <p className="text-xs text-ink-500">{new Date(h.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}{h.isOptional ? " · optional" : ""}</p>
              </div>
            ))}
            {holidays.data?.length === 0 && <p className="text-xs text-ink-300">None configured.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-line p-4 flex items-start gap-2.5">
        <ScrollText size={15} strokeWidth={1.75} className="text-ink-300 shrink-0 mt-0.5" />
        <p className="text-xs text-ink-400">Attendance policy (geofence enforcement) and payroll policy (PF/ESI/PT/TDS rates, overtime multiplier) are fixed in backend config — no admin UI exists for them because there&apos;s nothing to save them to.</p>
      </div>
    </div>
  );
}

function RolesTab() {
  return (
    <div>
      <p className="text-xs text-ink-300 mb-4">Roles are fixed by the system; this is a read-only view of what each role can reach. There is no dynamic permission editor yet.</p>
      <div className="space-y-3">
        {ALL_ROLES.map((role) => (
          <div key={role} className="rounded-xl border border-line bg-surface-1 shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} strokeWidth={1.75} className="text-accent" />
              <p className="text-sm font-semibold text-ink-900">{role.replace("_", " ")}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getNavItems(role).map((item) => (
                <span key={item.to} className="text-[11px] font-medium px-2 py-1 rounded-full bg-surface-2 text-ink-700">{item.label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdministrationPage() {
  useAuth();
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Administration</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">Company settings</h1>
      </div>
      <Tabs
        layoutId="admin-tabs"
        tabs={[
          { label: "Departments", content: <DepartmentsTab /> },
          { label: "Designations", content: <DesignationsTab /> },
          { label: "Office locations", content: <GeofenceTab /> },
          { label: "Policies", content: <PoliciesTab /> },
          { label: "Roles & permissions", content: <RolesTab /> },
        ]}
      />
    </div>
  );
}
