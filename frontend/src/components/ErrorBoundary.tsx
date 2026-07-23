import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCcw, RotateCcw } from "lucide-react";
import { logError } from "../utils/errorLogger";

interface Props {
  children: ReactNode;
  /** What broke, in user-facing terms, e.g. "Employees" — falls back to a generic message when omitted (the global, app-wide boundary). */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions so one broken page can't take down the
 * whole app with a blank white screen. Must be a class component — React has
 * no hook equivalent for getDerivedStateFromError/componentDidCatch.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, { componentStack: errorInfo.componentStack, scope: this.props.scope });
  }

  private handleTryAgain = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoToDashboard = () => {
    // Hard navigation, not react-router's navigate(): if the thing that broke
    // is anywhere in the provider/router tree, a soft navigation could fail
    // silently too. This always works.
    window.location.assign("/");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="min-h-[50vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-status-critical-soft text-status-critical mb-5">
            <AlertTriangle size={24} strokeWidth={1.75} />
          </span>
          <h1 className="font-display text-xl font-semibold text-ink-900 mb-2">
            {this.props.scope ? `${this.props.scope} ran into a problem` : "Something went wrong"}
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            This has been reported. Your data is safe — try again, or reload the page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={this.handleTryAgain}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-strong transition-colors"
            >
              <RotateCcw size={14} strokeWidth={2} /> Try again
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1 text-ink-700 text-sm font-semibold px-5 py-2.5 hover:bg-surface-2 transition-colors"
            >
              <RefreshCcw size={14} strokeWidth={2} /> Reload page
            </button>
            <button
              onClick={this.handleGoToDashboard}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1 text-ink-700 text-sm font-semibold px-5 py-2.5 hover:bg-surface-2 transition-colors"
            >
              <Home size={14} strokeWidth={2} /> Go to dashboard
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-xs bg-surface-2 text-status-critical rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
              {error.stack ?? error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
