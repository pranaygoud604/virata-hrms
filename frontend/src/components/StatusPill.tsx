type Tone = "good" | "warn" | "critical" | "neutral" | "accent" | "brass";

const toneClasses: Record<Tone, string> = {
  good: "bg-status-good-soft text-status-good",
  warn: "bg-status-warn-soft text-status-warn",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-surface-2 text-ink-500",
  accent: "bg-accent-soft text-accent",
  brass: "bg-brass-soft text-brass",
};

export default function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
