import { AlertCircle, RefreshCcw } from "lucide-react";

export default function ErrorState({
  message = "Couldn't load this data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-dashed border-status-critical/40 bg-status-critical-soft/30 px-6 py-10 text-center">
      <AlertCircle size={20} strokeWidth={1.75} className="text-status-critical mx-auto mb-2" />
      <p className="text-sm text-ink-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-accent hover:underline"
        >
          <RefreshCcw size={12} strokeWidth={2} /> Try again
        </button>
      )}
    </div>
  );
}
