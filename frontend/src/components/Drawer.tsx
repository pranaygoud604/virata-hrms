import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function Drawer({
  open,
  onClose,
  children,
  width = 480,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  /** Optional explicit label for screen readers; falls back to the drawer's first heading if omitted. */
  title?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-[1px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: `min(${width}px, 100vw)` }}
            className="fixed top-0 right-0 bottom-0 z-50 bg-surface-1 shadow-floating overflow-y-auto outline-none"
          >
            {title && <span id={titleId} className="sr-only">{title}</span>}
            {children}
            {/* Rendered after children so focus-trap's "first focusable element" lands on real
                content (e.g. the first form field) rather than this button on open. */}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-2 right-2 h-11 w-11 rounded-full flex items-center justify-center text-ink-500 hover:bg-surface-2 transition-colors z-10"
            >
              <X size={17} strokeWidth={1.75} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
