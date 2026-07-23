import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (type: ToastType, title: string, description?: string, duration?: number) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  update: (id: string, patch: Partial<Omit<ToastItem, "id">>) => void;
  dismiss: (id: string) => void;
  promise: <T>(p: Promise<T>, opts: { loading: string; success: string | ((v: T) => string); error: string | ((e: unknown) => string) }) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastType, number | undefined> = {
  success: 4000,
  info: 4000,
  warning: 5500,
  error: 7000,
  loading: undefined,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const scheduleDismiss = useCallback((id: string, duration?: number) => {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    if (duration == null) return;
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  const show = useCallback((type: ToastType, title: string, description?: string, duration?: number) => {
    const id = `toast-${++counter.current}`;
    const finalDuration = duration ?? DEFAULT_DURATION[type];
    setToasts((prev) => [...prev, { id, type, title, description, duration: finalDuration }]);
    scheduleDismiss(id, finalDuration);
    return id;
  }, [scheduleDismiss]);

  const update = useCallback((id: string, patch: Partial<Omit<ToastItem, "id">>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const finalDuration = patch.duration !== undefined ? patch.duration : (patch.type ? DEFAULT_DURATION[patch.type] : undefined);
    if (patch.type) scheduleDismiss(id, finalDuration);
  }, [scheduleDismiss]);

  const promise = useCallback(async <T,>(p: Promise<T>, opts: { loading: string; success: string | ((v: T) => string); error: string | ((e: unknown) => string) }) => {
    const id = show("loading", opts.loading);
    try {
      const result = await p;
      const msg = typeof opts.success === "function" ? opts.success(result) : opts.success;
      update(id, { type: "success", title: msg });
      return result;
    } catch (err) {
      const msg = typeof opts.error === "function" ? opts.error(err) : opts.error;
      update(id, { type: "error", title: msg });
      throw err;
    }
  }, [show, update]);

  const value: ToastContextValue = {
    toasts,
    show,
    success: (title, description) => show("success", title, description),
    error: (title, description) => show("error", title, description),
    warning: (title, description) => show("warning", title, description),
    info: (title, description) => show("info", title, description),
    loading: (title, description) => show("loading", title, description),
    update,
    dismiss,
    promise,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
