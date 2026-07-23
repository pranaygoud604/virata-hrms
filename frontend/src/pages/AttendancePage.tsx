import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Coffee, FileWarning, LogIn, LogOut, Square } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import Drawer from "../components/Drawer";
import ErrorState from "../components/ErrorState";
import Timeline, { type TimelineItem } from "../components/Timeline";
import MonthCalendar, { type DayMarker } from "../components/MonthCalendar";
import type { AttendanceRecord, Employee, GeoFenceLocation } from "../api/types";
import { useGeolocation } from "../hooks/useGeolocation";
import { dateKey } from "../utils/date";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const statusTone = { PRESENT: "good", LATE: "warn", HALF_DAY: "warn", ABSENT: "critical", ON_LEAVE: "neutral" } as const;
const calendarTone: Record<AttendanceRecord["status"], DayMarker["tone"]> = { PRESENT: "good", LATE: "warn", HALF_DAY: "warn", ABSENT: "critical", ON_LEAVE: "accent" };
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MANAGE_ROLES = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"];

const correctionSchema = z.object({
  date: z.string().min(1, "Required"),
  note: z.string().min(5, "Tell us what happened"),
});
type CorrectionForm = z.infer<typeof correctionSchema>;

function hoursBetween(a: string, b: string): string {
  const hrs = (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
  return `${hrs.toFixed(1)}h`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { locate, locating, error: geoError } = useGeolocation();
  const [clock, setClock] = useState(new Date());
  const [showCorrection, setShowCorrection] = useState(false);
  const [teamEmployeeId, setTeamEmployeeId] = useState("");
  const canManageTeam = user ? MANAGE_ROLES.includes(user.role) : false;

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const history = useQuery({ queryKey: ["attendance", "me"], queryFn: async () => (await api.get<AttendanceRecord[]>("/attendance/me")).data });
  const geofences = useQuery({ queryKey: ["geofence-locations"], queryFn: async () => (await api.get<GeoFenceLocation[]>("/geofence-locations")).data });
  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data, enabled: canManageTeam });

  const scopedEmployees = useMemo(
    () => (user?.role === "MANAGER" ? (employees.data ?? []).filter((e) => e.managerId === user.employeeId) : employees.data ?? []),
    [employees.data, user],
  );

  const teamHistory = useQuery({
    queryKey: ["attendance", "employee", teamEmployeeId],
    queryFn: async () => (await api.get<AttendanceRecord[]>(`/attendance/employee/${teamEmployeeId}`)).data,
    enabled: !!teamEmployeeId,
  });

  const today = history.data?.find((r) => r.date.slice(0, 10) === dateKey(new Date()));
  const state = today?.checkOutAt ? "done" : today?.checkInAt ? "in" : "out";
  const openBreak = today?.breaks?.find((b) => !b.endAt);

  const checkIn = useMutation({
    mutationFn: async () => (await api.post("/attendance/check-in", await locate())).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", "me"] }); toast.success("Checked in"); },
    onError: (err) => toast.error("Check-in failed", extractErrorMessage(err)),
  });
  const checkOut = useMutation({
    mutationFn: async () => (await api.post("/attendance/check-out", await locate())).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", "me"] }); toast.success("Checked out"); },
    onError: (err) => toast.error("Check-out failed", extractErrorMessage(err)),
  });
  const startBreak = useMutation({
    mutationFn: async () => (await api.post("/attendance/break/start")).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", "me"] }); toast.info("Break started"); },
    onError: (err) => toast.error("Could not start break", extractErrorMessage(err)),
  });
  const endBreak = useMutation({
    mutationFn: async () => (await api.post("/attendance/break/end")).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", "me"] }); toast.info("Break ended"); },
    onError: (err) => toast.error("Could not end break", extractErrorMessage(err)),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CorrectionForm>({ resolver: zodResolver(correctionSchema) });
  const submitCorrection = useMutation({
    mutationFn: async (data: CorrectionForm) => (await api.post("/attendance/correction", data)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", "me"] }); reset(); setShowCorrection(false); toast.success("Correction submitted"); },
    onError: (err) => toast.error("Could not submit this correction", extractErrorMessage(err)),
  });

  const actionError =
    (checkIn.isError && extractErrorMessage(checkIn.error, "Check-in failed.")) ||
    (checkOut.isError && extractErrorMessage(checkOut.error, "Check-out failed.")) ||
    (startBreak.isError && extractErrorMessage(startBreak.error, "Could not start break.")) ||
    (endBreak.isError && extractErrorMessage(endBreak.error, "Could not end break.")) ||
    geoError;
  const busy = locating || checkIn.isPending || checkOut.isPending;

  const activeFence = geofences.data?.find((g) => g.isActive);
  const mapCenter: [number, number] = today?.checkInLat != null
    ? [today.checkInLat, today.checkInLng!]
    : activeFence
      ? [activeFence.latitude, activeFence.longitude]
      : [17.4126, 78.4482];

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dateKey(d);
    const record = history.data?.find((r) => r.date.slice(0, 10) === key);
    return { date: d, record };
  });

  const monthMarkers = useMemo(() => {
    const map: Record<string, DayMarker[]> = {};
    for (const r of history.data ?? []) {
      map[r.date.slice(0, 10)] = [{ tone: calendarTone[r.status] }];
    }
    return map;
  }, [history.data]);

  const timelineItems: TimelineItem[] = (history.data ?? []).slice(0, 8).map((r) => ({
    key: r.id,
    icon: <span className="text-[10px] font-semibold">{r.date.slice(8, 10)}</span>,
    tone: statusTone[r.status],
    title: `${r.status.replace("_", " ")} — ${new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}`,
    meta: (
      <span>
        {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : "—"} → {r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : "—"}
        {r.checkInAt && r.checkOutAt && <span className="text-ink-300"> · {hoursBetween(r.checkInAt, r.checkOutAt)} worked</span>}
        {r.breaks && r.breaks.length > 0 && <span className="text-ink-300"> · {r.breaks.length} break{r.breaks.length > 1 ? "s" : ""}</span>}
        {r.correctionNote && <span className="text-status-warn"> · correction requested</span>}
      </span>
    ),
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Time &amp; GPS</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Attendance workspace</h1>
        </div>
        <button onClick={() => setShowCorrection(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
          <FileWarning size={13} strokeWidth={2} /> Report a correction
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-3xl border border-line bg-surface-1 shadow-card p-8 flex flex-col justify-between">
          <div>
            <p className="font-display text-5xl font-semibold text-ink-900 tabular-nums">
              {clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              <span className="text-2xl text-ink-300 ml-1">{clock.toLocaleTimeString("en-IN", { second: "2-digit" }).slice(-2)}</span>
            </p>
            <p className="text-sm text-ink-500 mt-1">{clock.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>

          {actionError && <p className="text-sm text-status-critical mt-4">{String(actionError)}</p>}

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => (state === "out" ? checkIn.mutate() : state === "in" ? checkOut.mutate() : undefined)}
              disabled={state === "done" || busy}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                state === "in" ? "bg-status-critical hover:brightness-95" : "bg-accent hover:bg-accent-strong"
              }`}
            >
              {state === "in" ? <LogOut size={16} strokeWidth={2} /> : <LogIn size={16} strokeWidth={2} />}
              {busy ? "Locating…" : state === "done" ? "Done for today" : state === "in" ? "Check Out" : "Check In"}
            </motion.button>

            {state === "in" && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => (openBreak ? endBreak.mutate() : startBreak.mutate())}
                disabled={startBreak.isPending || endBreak.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink-700 hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                {openBreak ? <Square size={14} strokeWidth={2} /> : <Coffee size={15} strokeWidth={1.75} />}
                {openBreak ? "End break" : "Start break"}
              </motion.button>
            )}

            {today?.status && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTone[today.status] === "good" ? "bg-status-good-soft text-status-good" : statusTone[today.status] === "warn" ? "bg-status-warn-soft text-status-warn" : "bg-surface-2 text-ink-500"}`}>
                {today.status}
              </span>
            )}
            {openBreak && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brass-soft text-brass">On break since {new Date(openBreak.startAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface-1 shadow-card overflow-hidden h-64 lg:h-auto relative">
          <MapContainer center={mapCenter} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%", minHeight: 260 }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {activeFence && (
              <Circle center={[activeFence.latitude, activeFence.longitude]} radius={activeFence.radiusMeters} pathOptions={{ color: "#5b3f6b", fillColor: "#5b3f6b", fillOpacity: 0.12 }} />
            )}
            {today?.checkInLat != null && <Marker position={[today.checkInLat, today.checkInLng!]} />}
          </MapContainer>
          {activeFence && (
            <div className="absolute bottom-3 left-3 bg-surface-1/95 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-ink-700 shadow-card z-[400]">
              {activeFence.name} · {activeFence.radiusMeters}m radius
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface-1 shadow-card p-6 mb-6">
        <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-4">This week</p>
        <div className="grid grid-cols-7 gap-2">
          {week.map(({ date, record }, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-ink-300 mb-1.5">{WEEKDAYS[date.getDay()]}</p>
              <div
                className={`h-14 rounded-xl flex items-center justify-center text-sm font-medium ${
                  record ? (statusTone[record.status] === "good" ? "bg-status-good-soft text-status-good" : statusTone[record.status] === "warn" ? "bg-status-warn-soft text-status-warn" : "bg-surface-2 text-ink-500") : "bg-surface-sunken text-ink-300"
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">History</h2>
          {history.isError ? <ErrorState message="Couldn't load attendance history." onRetry={() => history.refetch()} /> : <Timeline items={timelineItems} />}
        </div>
        <div>
          <MonthCalendar markers={monthMarkers} />
        </div>
      </div>

      {canManageTeam && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Team attendance</h2>
          <div className="max-w-xs mb-4">
            <select value={teamEmployeeId} onChange={(e) => setTeamEmployeeId(e.target.value)} className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent">
              <option value="">Select an employee…</option>
              {scopedEmployees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          {teamEmployeeId && (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-2 text-left text-xs text-ink-500 uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Check in</th>
                    <th className="px-4 py-2.5 font-medium">Check out</th>
                    <th className="px-4 py-2.5 font-medium">Worked</th>
                  </tr>
                </thead>
                <tbody>
                  {teamHistory.data?.slice(0, 15).map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2.5 text-ink-900">{new Date(r.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusTone[r.status] === "good" ? "bg-status-good-soft text-status-good" : statusTone[r.status] === "warn" ? "bg-status-warn-soft text-status-warn" : "bg-surface-2 text-ink-500"}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-700">{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-4 py-2.5 text-ink-700">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-4 py-2.5 text-ink-700">{r.checkInAt && r.checkOutAt ? hoursBetween(r.checkInAt, r.checkOutAt) : "—"}</td>
                    </tr>
                  ))}
                  {teamHistory.data?.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-300">No attendance records yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Drawer open={showCorrection} onClose={() => setShowCorrection(false)} title="Report a correction">
        <div className="p-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Report a correction</h2>
          <p className="text-sm text-ink-500 mb-6">Missed a check-in or check-out? Let your manager or HR know what actually happened.</p>
          <form onSubmit={handleSubmit((data) => submitCorrection.mutate(data))} className="space-y-4">
            <div>
              <label htmlFor="correction-date" className="block text-xs font-medium text-ink-700 mb-1.5">Date</label>
              <input id="correction-date" type="date" {...register("date")} className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent" />
              {errors.date && <p className="text-xs text-status-critical mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label htmlFor="correction-note" className="block text-xs font-medium text-ink-700 mb-1.5">What happened?</label>
              <textarea id="correction-note" {...register("note")} rows={3} className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent" />
              {errors.note && <p className="text-xs text-status-critical mt-1">{errors.note.message}</p>}
            </div>
            <button type="submit" disabled={submitCorrection.isPending} className="w-full rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
              {submitCorrection.isPending ? "Submitting…" : "Submit"}
            </button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
