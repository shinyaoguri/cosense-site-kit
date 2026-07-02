import {
  buildIntermediate,
  type CosenseSiteConfig,
  type IntermediateData,
  loadCosenseSiteConfig,
} from "@cosense-site-kit/core";

// Options that determine a single buildIntermediate() run. The integration and
// the content loader both funnel through here, so they must be able to describe
// the same run with the same fields — otherwise the memo key differs and the
// full pipeline (fetch + parse + normalize of every page) runs twice per
// process. `ttlMs` is behavioral (dev freshness), not part of the identity, so
// it is excluded from the key.
export interface SharedIntermediateOptions {
  configFile?: string;
  config?: CosenseSiteConfig;
  cacheDir?: string;
  force?: boolean;
  previewDrafts?: boolean;
  /** Memo lifetime in ms. Omit (build) → never expires; set in dev for freshness. */
  ttlMs?: number;
}

/** Dev-mode memo lifetime: page content re-fetches (differentially, so cheap) at most this often. */
export const DEV_TTL_MS = 30_000;

// Deterministic serialization: undefined fields dropped and object keys sorted
// recursively, so two callers that mean the same run (e.g. one passes a config
// object, both in a different key order) still produce an identical memo key.
function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function sharedIntermediateKey(opts: SharedIntermediateOptions): string {
  return stableStringify({
    configFile: opts.configFile,
    config: opts.config,
    cacheDir: opts.cacheDir,
    force: opts.force,
    previewDrafts: opts.previewDrafts,
  });
}

// Module-level memo so the cosense() integration and the content loader share a
// single buildIntermediate() invocation per process. Keyed on the normalized
// options so multiple sites in one Astro install stay isolated.
interface Memo {
  key: string;
  data: Promise<IntermediateData>;
  expiresAt: number;
}
let memo: Memo | null = null;

/** Drop the memo so the next call rebuilds. Called on dev restart / config change. */
export function invalidateSharedIntermediate(): void {
  memo = null;
}

async function defaultBuild(opts: SharedIntermediateOptions): Promise<IntermediateData> {
  const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
  return buildIntermediate({
    config,
    cacheDir: opts.cacheDir,
    force: opts.force,
    previewDrafts: opts.previewDrafts,
  });
}

// `build` is injectable for tests; production always uses defaultBuild.
export function getSharedIntermediate(
  opts: SharedIntermediateOptions,
  build: (o: SharedIntermediateOptions) => Promise<IntermediateData> = defaultBuild,
): Promise<IntermediateData> {
  const key = sharedIntermediateKey(opts);
  const now = Date.now();
  if (memo && memo.key === key && memo.expiresAt > now) return memo.data;

  const promise = build(opts);
  const expiresAt = opts.ttlMs == null ? Number.POSITIVE_INFINITY : now + opts.ttlMs;
  memo = { key, data: promise, expiresAt };

  // Never keep a rejected promise: if the first run fails (e.g. Cosense
  // unreachable at startup), the next call must retry instead of replaying the
  // same error until the process restarts.
  promise.catch(() => {
    if (memo?.data === promise) memo = null;
  });
  return promise;
}
