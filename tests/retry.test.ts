import { afterEach, describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/utils/retry.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("retry utility", () => {
  it("retries transient errors and eventually succeeds", async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue("ok");

    const resultPromise = withRetry(operation, 3);
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("respects the retry-after delay for rate limits", async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce({ status: 429, response: { headers: { "retry-after": "2" } } })
      .mockResolvedValue("ok");

    const resultPromise = withRetry(operation, 2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const operation = vi.fn().mockRejectedValue({ status: 404 });

    await expect(withRetry(operation, 3)).rejects.toMatchObject({ status: 404 });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("stops after the configured number of attempts", async () => {
    vi.useFakeTimers();
    const error = { status: 500 };
    const operation = vi.fn().mockRejectedValue(error);

    const resultPromise = withRetry(operation, 2);
    const rejection = expect(resultPromise).rejects.toBe(error);
    await vi.runAllTimersAsync();

    await rejection;
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
