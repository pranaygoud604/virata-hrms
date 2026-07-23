/** Extracts a human-readable message from an axios/NestJS error shape without resorting to `as any`. */
export function extractErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string | string[] | { message?: string | string[] } } } }).response;
    const message = response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
    if (message && typeof message === "object" && "message" in message) {
      const nested = message.message;
      if (typeof nested === "string") return nested;
      if (Array.isArray(nested)) return nested.join(", ");
    }
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
