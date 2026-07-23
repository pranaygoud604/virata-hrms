import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Fingerprint, PartyPopper, Users as UsersIcon, Video } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import MonthCalendar, { type DayMarker } from "../components/MonthCalendar";
import ErrorState from "../components/ErrorState";
import { dateKey, parseDateOnly } from "../utils/date";
import type { AttendanceRecord, Holiday, Interview, LeaveRequest } from "../api/types";

const APPROVER_ROLES = ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"];

interface AgendaItem {
  key: string;
  icon: ReactNode;
  tone: DayMarker["tone"];
  label: string;
}

export default function GlobalCalendarPage() {
  const { user } = useAuth();
  const isApprover = user ? APPROVER_ROLES.includes(user.role) : false;
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(new Date()));

  const attendance = useQuery({ queryKey: ["attendance", "me"], queryFn: async () => (await api.get<AttendanceRecord[]>("/attendance/me")).data });
  const myLeave = useQuery({ queryKey: ["leave-requests", "me"], queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/me")).data });
  const holidays = useQuery({ queryKey: ["holidays"], queryFn: async () => (await api.get<Holiday[]>(`/holidays?year=${new Date().getFullYear()}`)).data });
  const pendingLeave = useQuery({
    queryKey: ["leave-requests", "pending-approvals"],
    queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/pending-approvals")).data,
    enabled: isApprover,
  });
  const myInterviews = useQuery({ queryKey: ["interviews", "me"], queryFn: async () => (await api.get<Interview[]>("/interviews/me")).data });
  const allFailed = attendance.isError && myLeave.isError && holidays.isError && myInterviews.isError;

  const markers = useMemo(() => {
    const map: Record<string, DayMarker[]> = {};
    const add = (key: string, tone: DayMarker["tone"]) => { map[key] = [...(map[key] ?? []), { tone }]; };

    for (const r of attendance.data ?? []) if (r.checkInAt) add(r.date.slice(0, 10), "good");
    for (const l of (myLeave.data ?? []).filter((l) => l.status !== "CANCELLED")) {
      const cursor = parseDateOnly(l.startDate);
      const end = parseDateOnly(l.endDate);
      while (cursor.getTime() <= end.getTime()) { add(dateKey(cursor), l.status === "APPROVED" ? "accent" : "warn"); cursor.setDate(cursor.getDate() + 1); }
    }
    for (const h of holidays.data ?? []) add(h.date.slice(0, 10), "brass");
    for (const p of pendingLeave.data ?? []) {
      const cursor = parseDateOnly(p.startDate);
      const end = parseDateOnly(p.endDate);
      while (cursor.getTime() <= end.getTime()) { add(dateKey(cursor), "warn"); cursor.setDate(cursor.getDate() + 1); }
    }
    for (const iv of myInterviews.data ?? []) add(iv.scheduledAt.slice(0, 10), "critical");
    return map;
  }, [attendance.data, myLeave.data, holidays.data, pendingLeave.data, myInterviews.data]);

  const agenda: AgendaItem[] = useMemo(() => {
    const items: AgendaItem[] = [];
    const today = attendance.data?.find((r) => r.date.slice(0, 10) === selectedDate);
    if (today?.checkInAt) items.push({ key: "att", icon: <Fingerprint size={14} strokeWidth={1.75} />, tone: "good", label: `Checked in ${new Date(today.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` });

    for (const l of myLeave.data ?? []) {
      if (l.status === "CANCELLED") continue;
      if (selectedDate >= l.startDate.slice(0, 10) && selectedDate <= l.endDate.slice(0, 10)) {
        items.push({ key: `leave-${l.id}`, icon: <CalendarDays size={14} strokeWidth={1.75} />, tone: l.status === "APPROVED" ? "accent" : "warn", label: `${l.leaveType?.name ?? "Leave"} (${l.status.toLowerCase()})` });
      }
    }
    for (const p of pendingLeave.data ?? []) {
      if (selectedDate >= p.startDate.slice(0, 10) && selectedDate <= p.endDate.slice(0, 10)) {
        items.push({ key: `pending-${p.id}`, icon: <UsersIcon size={14} strokeWidth={1.75} />, tone: "warn", label: `${p.employee?.firstName} ${p.employee?.lastName} — leave pending your approval` });
      }
    }
    for (const h of holidays.data ?? []) {
      if (h.date.slice(0, 10) === selectedDate) items.push({ key: `hol-${h.id}`, icon: <PartyPopper size={14} strokeWidth={1.75} />, tone: "brass", label: `${h.name} (holiday)` });
    }
    for (const iv of myInterviews.data ?? []) {
      if (iv.scheduledAt.slice(0, 10) === selectedDate) items.push({ key: `iv-${iv.id}`, icon: <Video size={14} strokeWidth={1.75} />, tone: "critical", label: `Interview at ${new Date(iv.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · ${iv.mode}` });
    }
    return items;
  }, [selectedDate, attendance.data, myLeave.data, pendingLeave.data, holidays.data, myInterviews.data]);

  const toneBg: Record<DayMarker["tone"], string> = {
    good: "bg-status-good-soft text-status-good", warn: "bg-status-warn-soft text-status-warn", critical: "bg-status-critical-soft text-status-critical",
    accent: "bg-accent-soft text-accent", brass: "bg-brass-soft text-brass",
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Everything, one place</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">Calendar</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-good" /> Attendance</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Approved leave</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-warn" /> Pending leave</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brass" /> Holiday</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-critical" /> Interview</span>
      </div>

      {allFailed && (
        <ErrorState
          message="Couldn't load your calendar."
          onRetry={() => { attendance.refetch(); myLeave.refetch(); holidays.refetch(); myInterviews.refetch(); if (isApprover) pendingLeave.refetch(); }}
        />
      )}

      {!allFailed && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthCalendar markers={markers} selectedDate={selectedDate} onSelectDate={(d) => setSelectedDate(dateKey(d))} />
        </div>
        <div>
          <p className="text-xs text-ink-500 uppercase tracking-wide mb-3">
            {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {agenda.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm text-ink-300">Nothing on this day.</div>
          ) : (
            <div className="space-y-2">
              {agenda.map((a) => (
                <div key={a.key} className="rounded-2xl border border-line bg-surface-1 shadow-card p-3.5 flex items-center gap-3">
                  <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[a.tone]}`}>{a.icon}</span>
                  <p className="text-sm text-ink-900">{a.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
