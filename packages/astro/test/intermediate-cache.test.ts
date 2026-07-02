import type { IntermediateData } from "@cosense-site-kit/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSharedIntermediate,
  invalidateSharedIntermediate,
  type SharedIntermediateOptions,
  sharedIntermediateKey,
} from "../src/intermediate-cache";

// The memo is module-level shared state; isolate every test.
beforeEach(() => invalidateSharedIntermediate());
afterEach(() => vi.useRealTimers());

const fakeData = { pages: [] } as unknown as IntermediateData;

describe("sharedIntermediateKey", () => {
  it("treats an absent field and an explicit undefined the same", () => {
    // The integration passes only configFile; the loader spreads its opts and
    // may include cacheDir/force as undefined. Both must key identically.
    const integrationKey = sharedIntermediateKey({ configFile: "cosense.config.ts" });
    const loaderKey = sharedIntermediateKey({
      configFile: "cosense.config.ts",
      cacheDir: undefined,
      force: undefined,
      previewDrafts: undefined,
    });
    expect(loaderKey).toBe(integrationKey);
  });

  it("is independent of config object key order", () => {
    const a = sharedIntermediateKey({ config: { x: 1, y: 2 } as never });
    const b = sharedIntermediateKey({ config: { y: 2, x: 1 } as never });
    expect(a).toBe(b);
  });

  it("distinguishes runs that differ (force, cacheDir)", () => {
    const base = sharedIntermediateKey({ configFile: "c" });
    expect(sharedIntermediateKey({ configFile: "c", force: true })).not.toBe(base);
    expect(sharedIntermediateKey({ configFile: "c", cacheDir: "x" })).not.toBe(base);
  });

  it("ignores ttlMs (behavioral, not identity)", () => {
    expect(sharedIntermediateKey({ configFile: "c", ttlMs: 30_000 })).toBe(
      sharedIntermediateKey({ configFile: "c" }),
    );
  });
});

describe("getSharedIntermediate", () => {
  it("runs the pipeline once when the integration and loader agree on options", async () => {
    const build = vi.fn(async () => fakeData);
    // Integration-style call, then loader-style call with matching intent.
    await getSharedIntermediate({ configFile: "c", previewDrafts: true }, build);
    await getSharedIntermediate(
      { configFile: "c", cacheDir: undefined, force: undefined, previewDrafts: true },
      build,
    );
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("runs twice when options actually differ", async () => {
    const build = vi.fn(async () => fakeData);
    await getSharedIntermediate({ configFile: "c" }, build);
    await getSharedIntermediate({ configFile: "c", force: true }, build);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("does not memoize a rejected run — the next call retries", async () => {
    const build = vi
      .fn()
      .mockRejectedValueOnce(new Error("cosense offline"))
      .mockResolvedValueOnce(fakeData);
    await expect(getSharedIntermediate({ configFile: "c" }, build)).rejects.toThrow("offline");
    // Network recovered: a second call must rebuild rather than replay the error.
    await expect(getSharedIntermediate({ configFile: "c" }, build)).resolves.toBe(fakeData);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("reuses within the TTL and rebuilds after it expires (dev freshness)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const build = vi.fn(async () => fakeData);
    const opts: SharedIntermediateOptions = { configFile: "c", ttlMs: 30_000 };

    await getSharedIntermediate(opts, build);
    vi.setSystemTime(20_000); // within TTL
    await getSharedIntermediate(opts, build);
    expect(build).toHaveBeenCalledTimes(1);

    vi.setSystemTime(40_000); // past TTL
    await getSharedIntermediate(opts, build);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("never expires without a TTL (build reuses one run)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const build = vi.fn(async () => fakeData);
    await getSharedIntermediate({ configFile: "c" }, build);
    vi.setSystemTime(10 * 60_000);
    await getSharedIntermediate({ configFile: "c" }, build);
    expect(build).toHaveBeenCalledTimes(1);
  });
});
