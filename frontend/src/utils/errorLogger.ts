/**
 * Pluggable error-reporting sink. Defaults to console.error so nothing is lost
 * today; swap in a real backend (Sentry, etc.) later by calling
 * `setErrorLogger(...)` once during app bootstrap — nothing that calls
 * `logError` needs to change when that happens.
 */
export interface ErrorLogger {
  logError(error: unknown, context?: Record<string, unknown>): void;
}

const consoleLogger: ErrorLogger = {
  logError(error, context) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, context ?? "");
  },
};

let activeLogger: ErrorLogger = consoleLogger;

/** Call once at app startup to redirect error reporting to a real service, e.g.:
 *  `setErrorLogger({ logError: (error, context) => Sentry.captureException(error, { extra: context }) })` */
export function setErrorLogger(logger: ErrorLogger): void {
  activeLogger = logger;
}

export function logError(error: unknown, context?: Record<string, unknown>): void {
  activeLogger.logError(error, context);
}
