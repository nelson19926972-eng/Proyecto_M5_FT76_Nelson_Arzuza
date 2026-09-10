import { log } from "./logging.js";

export async function withRetry<T>(operation: () => Promise<T>, maxAttempts = Number(process.env.RETRY_MAX_ATTEMPTS ?? 3)): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
      const retryable = status === 429 || (typeof status === "number" && status >= 500);
      if (!retryable || attempt === maxAttempts) throw error;
      const headers = typeof error === "object" && error !== null && "response" in error && typeof error.response === "object" && error.response !== null && "headers" in error.response && typeof error.response.headers === "object" && error.response.headers !== null ? error.response.headers as Record<string, unknown> : undefined;
      const retryAfter = Number(headers?.["retry-after"] ?? NaN);
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 2 ** (attempt - 1) * 250;
      log("info", "Retrying GitHub request", { attempt, delay, status });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Retry failed");
}