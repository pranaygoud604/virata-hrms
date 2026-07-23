import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateKey } from "../utils/date";

export interface DayMarker {
  tone: "accent" | "good" | "warn" | "critical" | "brass";
  label?: string;
}

const toneDot: Record<DayMarker["tone"], string> = {
  accent: "bg-accent",
  good: "bg-status-good",
  warn: "bg-status-warn",
  critical: "bg-status-critical",
  brass: "bg-brass",
};

export default function MonthCalendar({
  markers = {},
  onSelectDate,
  selectedDate,
}: {
  markers?: Record<string, DayMarker[]>;
  onSelectDate?: (date: Date) => void;
  selectedDate?: string;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-lg font-semibold text-ink-900">
          {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="h-9 w-9 rounded-full flex items-center justify-center text-ink-500 hover:bg-surface-2 transition-colors"
          >
            <ChevronLeft size={15} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="h-9 w-9 rounded-full flex items-center justify-center text-ink-500 hover:bg-surface-2 transition-colors"
          >
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-300 uppercase mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = dateKey(d);
          const dayMarkers = markers[key] ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const fullLabel = d.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
          return (
            <button
              key={i}
              onClick={() => onSelectDate?.(d)}
              aria-label={`${fullLabel}${dayMarkers.length > 0 ? `, ${dayMarkers.length} event${dayMarkers.length !== 1 ? "s" : ""}` : ""}`}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={onSelectDate ? isSelected : undefined}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                isSelected ? "bg-accent text-white" : isToday ? "bg-accent-soft text-accent font-semibold" : "text-ink-700 hover:bg-surface-2"
              }`}
            >
              <span>{d.getDate()}</span>
              {dayMarkers.length > 0 && (
                <span className="flex gap-0.5">
                  {dayMarkers.slice(0, 3).map((m, mi) => (
                    <span key={mi} className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : toneDot[m.tone]}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
