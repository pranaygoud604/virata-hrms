import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { useToast, type ToastType } from "../contexts/ToastContext";

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const TONE_CLASSES: Record<ToastType, string> = {
  success: "text-status-good bg-status-good-soft",
  error: "text-status-critical bg-status-critical-soft",
  warning: "text-status-warn bg-status-warn-soft",
  info: "text-accent bg-accent-soft",
  loading: "text-ink-500 bg-surface-2",
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto rounded-2xl border border-line bg-surface-1 shadow-floating p-3.5 flex items-start gap-2.5"
            >
              <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${TONE_CLASSES[t.type]}`}>
                <Icon size={15} strokeWidth={2} className={t.type === "loading" ? "animate-spin" : ""} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-ink-900">{t.title}</p>
                {t.description && <p className="text-xs text-ink-500 mt-0.5">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="h-9 w-9 -m-1 rounded-full flex items-center justify-center text-ink-300 hover:text-ink-900 hover:bg-surface-2 transition-colors shrink-0"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
