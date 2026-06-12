import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/util/retry";

describe("withRetry", () => {
  it("returns the first successful result without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success and reports the attempt number", async () => {
    let attempts = 0;
    const result = await withRetry(
      async (attempt) => {
        attempts = attempt;
        if (attempt < 2) throw new Error("fail");
        return "ok";
      },
      { minDelayMs: 1, maxDelayMs: 5 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("gives up after `retries` failures and throws the last error", async () => {
    const err = new Error("boom");
    await expect(
      withRetry(
        async () => {
          throw err;
        },
        { retries: 2, minDelayMs: 1, maxDelayMs: 2 },
      ),
    ).rejects.toBe(err);
  });

  it("stops retrying when shouldRetry returns false", async () => {
    const fn = vi.fn(async () => {
      throw new Error("nope");
    });
    await expect(
      withRetry(fn, {
        retries: 5,
        minDelayMs: 1,
        maxDelayMs: 2,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("aborts immediately when the signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort(new Error("cancelled"));
    const fn = vi.fn(async () => "should not run");
    await expect(withRetry(fn, { signal: ctrl.signal, retries: 3, minDelayMs: 1 })).rejects.toThrow(
      "cancelled",
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it("aborts mid-backoff when the signal fires during the sleep", async () => {
    const ctrl = new AbortController();
    const promise = withRetry(
      async () => {
        throw new Error("fail");
      },
      { signal: ctrl.signal, retries: 5, minDelayMs: 200 },
    );
    // Abort while the first backoff sleep is pending.
    setTimeout(() => ctrl.abort(new Error("cancelled")), 10);
    await expect(promise).rejects.toThrow("cancelled");
  });
});
