import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, Settings2 } from "lucide-react";
import type { WidgetDef } from "../hooks/useDashboardLayout";

export default function DashboardCustomizer({
  widgets,
  order,
  hidden,
  toggleHidden,
  move,
  reset,
}: {
  widgets: WidgetDef[];
  order: string[];
  hidden: Set<string>;
  toggleHidden: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  reset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const byId = new Map(widgets.map((w) => [w.id, w]));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1 text-ink-700 text-xs font-semibold px-3.5 py-2 hover:bg-surface-2 transition-colors"
      >
        <Settings2 size={13} strokeWidth={2} /> Customize
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-surface-1 shadow-floating p-3 z-50"
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-xs font-semibold text-ink-900">Dashboard widgets</p>
                <button onClick={reset} className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-500 hover:text-ink-900">
                  <RotateCcw size={11} strokeWidth={2} /> Reset
                </button>
              </div>
              <div className="space-y-0.5">
                {order.map((id, i) => {
                  const widget = byId.get(id);
                  if (!widget) return null;
                  const isHidden = hidden.has(id);
                  return (
                    <div key={id} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                      <span className={`flex-1 text-xs ${isHidden ? "text-ink-300" : "text-ink-900"}`}>{widget.label}</span>
                      <button onClick={() => move(id, -1)} disabled={i === 0} aria-label={`Move ${widget.label} up`} className="h-6 w-6 rounded flex items-center justify-center text-ink-500 hover:bg-surface-sunken disabled:opacity-30">
                        <ArrowUp size={11} strokeWidth={2} />
                      </button>
                      <button onClick={() => move(id, 1)} disabled={i === order.length - 1} aria-label={`Move ${widget.label} down`} className="h-6 w-6 rounded flex items-center justify-center text-ink-500 hover:bg-surface-sunken disabled:opacity-30">
                        <ArrowDown size={11} strokeWidth={2} />
                      </button>
                      <button onClick={() => toggleHidden(id)} aria-label={isHidden ? `Show ${widget.label}` : `Hide ${widget.label}`} aria-pressed={isHidden} className="h-6 w-6 rounded flex items-center justify-center text-ink-500 hover:bg-surface-sunken">
                        {isHidden ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
