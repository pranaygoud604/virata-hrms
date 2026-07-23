import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

interface ConfirmContextValue {
  state: ConfirmState;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULT_STATE: ConfirmState = { open: false, title: "" };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((res) => {
      resolver.current = res;
      setState({ ...options, open: true });
    });
  }, []);

  const resolve = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(DEFAULT_STATE);
  }, []);

  return <ConfirmContext.Provider value={{ state, confirm, resolve }}>{children}</ConfirmContext.Provider>;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx.confirm;
}

export function useConfirmState() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmState must be used within a ConfirmProvider");
  return ctx;
}
