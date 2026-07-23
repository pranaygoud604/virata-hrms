import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Clock, Moon, Plus } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { extractErrorMessage } from "../utils/apiError";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import { parseDateOnly } from "../utils/date";
import type { Holiday, Shift } from "../api/types";

const ADMIN_ROLES = ["HR_ADMIN", "SUPER_ADMIN"];
const inputClass =
  "w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent";

const shiftSchema = z.object({
  name: z.string().min(1, "Required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM, 24-hour"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:MM, 24-hour"),
  gracePeriodMinutes: z.coerce.number().min(0).optional(),
  isNightShift: z.boolean().optional(),
});
type ShiftForm = z.infer<typeof shiftSchema>;

const holidaySchema = z.object({ name: z.string().min(1, "Required"), date: z.string().min(1, "Required"), isOptional: z.boolean().optional() });
type HolidayForm = z.infer<typeof holidaySchema>;

export default function ShiftsHolidaysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;
  const [drawer, setDrawer] = useState<"shift" | "holiday" | null>(null);

  const shifts = useQuery({ queryKey: ["shifts"], queryFn: async () => (await api.get<Shift[]>("/shifts")).data });
  const holidays = useQuery({ queryKey: ["holidays"], queryFn: async () => (await api.get<Holiday[]>(`/holidays?year=${new Date().getFullYear()}`)).data });

  const shiftForm = useForm<ShiftForm>({ resolver: zodResolver(shiftSchema) });
  const holidayForm = useForm<HolidayForm>({ resolver: zodResolver(holidaySchema) });

  const createShift = useMutation({
    mutationFn: async (data: ShiftForm) => (await api.post("/shifts", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); shiftForm.reset(); setDrawer(null); toast.success(`"${variables.name}" added`); },
    onError: (err) => toast.error("Could not create the shift", extractErrorMessage(err)),
  });
  const deleteShift = useMutation({
    mutationFn: async (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); toast.success("Shift removed"); },
    onError: (err) => toast.error("Could not remove the shift", extractErrorMessage(err)),
  });
  const createHoliday = useMutation({
    mutationFn: async (data: HolidayForm) => (await api.post("/holidays", data)).data,
    onSuccess: (_d, variables) => { queryClient.invalidateQueries({ queryKey: ["holidays"] }); holidayForm.reset(); setDrawer(null); toast.success(`"${variables.name}" added`); },
    onError: (err) => toast.error("Could not add the holiday", extractErrorMessage(err)),
  });

  async function handleDeleteShift(s: Shift) {
    const ok = await confirm({
      title: `Remove "${s.name}"?`,
      description: "Employees currently assigned to this shift will need a new one.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (ok) deleteShift.mutate(s.id);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Scheduling</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Shifts &amp; Holidays</h1>
          <p className="text-sm text-ink-500 mt-2">Working-hour patterns and the {new Date().getFullYear()} holiday calendar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-900">Shifts</h2>
            {isAdmin && (
              <button onClick={() => setDrawer("shift")} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                <Plus size={13} /> Add shift
              </button>
            )}
          </div>
          <div className="space-y-2">
            {shifts.data?.length === 0 && <div className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-ink-300">No shifts yet.</div>}
            {shifts.data?.map((s) => (
              <div key={s.id} className="rounded-xl border border-line bg-surface-1 shadow-xs p-4 flex items-center gap-3">
                <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.isNightShift ? "bg-ink-900/5 text-ink-700" : "bg-accent-soft text-accent"}`}>
                  {s.isNightShift ? <Moon size={16} strokeWidth={1.75} /> : <Clock size={16} strokeWidth={1.75} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-500">{s.startTime} – {s.endTime} · {s.gracePeriodMinutes}m grace</p>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDeleteShift(s)} aria-label={`Remove ${s.name}`} className="text-xs font-semibold text-ink-300 hover:text-status-critical transition-colors">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-900">Holiday calendar</h2>
            {isAdmin && (
              <button onClick={() => setDrawer("holiday")} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                <Plus size={13} /> Add holiday
              </button>
            )}
          </div>
          <div className="space-y-2">
            {holidays.data?.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-ink-300">No holidays added for {new Date().getFullYear()} yet.</div>
            )}
            {holidays.data?.map((h) => {
              const d = parseDateOnly(h.date);
              return (
                <div key={h.id} className="rounded-xl border border-line bg-surface-1 shadow-xs p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-brass-soft flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-brass uppercase leading-none mt-1">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                    <span className="text-base font-semibold text-brass leading-none mt-0.5">{d.getDate()}</span>
                  </div>
                  <p className="font-medium text-ink-900 flex-1">{h.name}</p>
                  <StatusPill tone={h.isOptional ? "neutral" : "accent"}>{h.isOptional ? "Optional" : "Mandatory"}</StatusPill>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Drawer open={drawer === "shift"} onClose={() => setDrawer(null)} title="Add a shift">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add a shift</h2>
          <form onSubmit={shiftForm.handleSubmit((data) => createShift.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="shift-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
              <input id="shift-name" {...shiftForm.register("name")} placeholder="General Shift" className={inputClass} />
              {shiftForm.formState.errors.name && <p className="text-xs text-status-critical mt-1">{shiftForm.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="shift-start" className="block text-xs font-medium text-ink-700 mb-1.5">Start (HH:MM)</label>
                <input id="shift-start" {...shiftForm.register("startTime")} placeholder="09:30" className={inputClass} />
                {shiftForm.formState.errors.startTime && <p className="text-xs text-status-critical mt-1">{shiftForm.formState.errors.startTime.message}</p>}
              </div>
              <div>
                <label htmlFor="shift-end" className="block text-xs font-medium text-ink-700 mb-1.5">End (HH:MM)</label>
                <input id="shift-end" {...shiftForm.register("endTime")} placeholder="18:30" className={inputClass} />
                {shiftForm.formState.errors.endTime && <p className="text-xs text-status-critical mt-1">{shiftForm.formState.errors.endTime.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="shift-grace" className="block text-xs font-medium text-ink-700 mb-1.5">Grace period (min)</label>
                <input id="shift-grace" type="number" {...shiftForm.register("gracePeriodMinutes")} placeholder="10" className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-700 pt-5">
                <input type="checkbox" {...shiftForm.register("isNightShift")} className="h-4 w-4" /> Night shift
              </label>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={createShift.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createShift.isPending ? "Saving…" : "Add shift"}
            </motion.button>
          </form>
        </div>
      </Drawer>

      <Drawer open={drawer === "holiday"} onClose={() => setDrawer(null)} title="Add a holiday">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Add a holiday</h2>
          <form onSubmit={holidayForm.handleSubmit((data) => createHoliday.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="holiday-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
              <input id="holiday-name" {...holidayForm.register("name")} placeholder="Independence Day" className={inputClass} />
              {holidayForm.formState.errors.name && <p className="text-xs text-status-critical mt-1">{holidayForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="holiday-date" className="block text-xs font-medium text-ink-700 mb-1.5">Date</label>
              <input id="holiday-date" type="date" {...holidayForm.register("date")} className={inputClass} />
              {holidayForm.formState.errors.date && <p className="text-xs text-status-critical mt-1">{holidayForm.formState.errors.date.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" {...holidayForm.register("isOptional")} className="h-4 w-4" /> Optional holiday
            </label>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={createHoliday.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {createHoliday.isPending ? "Saving…" : "Add holiday"}
            </motion.button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
