import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useConfirmState } from "../contexts/ConfirmContext";

export default function ConfirmDialog() {
  const { state, resolve } = useConfirmState();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useFocusTrap(panelRef, state.open);

  useEffect(() => {
    if (!state.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") resolve(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.open, resolve]);

  const isDanger = state.tone !== "default";

  return (
    <AnimatePresence>
      {state.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => resolve(false)}
            aria-hidden="true"
            className="fixed inset-0 z-[90] bg-ink-900/40 backdrop-blur-[1px]"
          />
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={state.description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[95] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border border-line bg-surface-1 shadow-floating p-6 outline-none"
          >
            <div className="flex items-start gap-3 mb-5">
              {isDanger && (
                <span className="h-9 w-9 rounded-full bg-status-critical-soft text-status-critical flex items-center justify-center shrink-0">
                  <AlertTriangle size={17} strokeWidth={2} />
                </span>
              )}
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-lg font-semibold text-ink-900">{state.title}</h2>
                {state.description && <p id={descId} className="text-sm text-ink-500 mt-1">{state.description}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => resolve(false)}
                className="rounded-lg border border-line bg-surface-1 text-ink-700 text-sm font-semibold px-4 py-2 hover:bg-surface-2 transition-colors"
              >
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => resolve(true)}
                className={`rounded-lg text-sm font-semibold px-4 py-2 text-white transition-colors ${
                  isDanger ? "bg-status-critical hover:brightness-95" : "bg-accent hover:bg-accent-strong"
                }`}
              >
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
