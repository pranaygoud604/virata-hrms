import type { ReactNode } from "react";

export interface TimelineItem {
  key: string;
  icon: ReactNode;
  tone?: "accent" | "good" | "warn" | "critical" | "neutral" | "brass";
  title: ReactNode;
  meta?: ReactNode;
}

const toneClasses: Record<NonNullable<TimelineItem["tone"]>, string> = {
  accent: "bg-accent-soft text-accent",
  good: "bg-status-good-soft text-status-good",
  warn: "bg-status-warn-soft text-status-warn",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-surface-2 text-ink-500",
  brass: "bg-brass-soft text-brass",
};

export default function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-300">Nothing here yet.</div>;
  }
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-line" aria-hidden="true" />
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.key} className="relative flex gap-4">
            <span className={`relative z-10 h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${toneClasses[item.tone ?? "neutral"]}`}>
              {item.icon}
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="text-sm text-ink-900">{item.title}</div>
              {item.meta && <div className="text-xs text-ink-500 mt-0.5">{item.meta}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
