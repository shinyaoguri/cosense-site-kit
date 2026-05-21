import {
  buildIntermediate,
  type IntermediateData,
  loadCosenseSiteConfig,
} from "@cosense-site-kit/core";
import type { CosenseLoaderOptions } from "./loader";

// Module-level memo so the cosense() integration and both content loaders
// share a single buildIntermediate() invocation per process. Keyed on the
// loader-args JSON so multiple sites in one Astro install stay isolated.
let memo: { key: string; data: Promise<IntermediateData> } | null = null;

export function getSharedIntermediate(opts: CosenseLoaderOptions): Promise<IntermediateData> {
  const key = JSON.stringify({
    configFile: opts.configFile,
    config: opts.config,
    cacheDir: opts.cacheDir,
    force: opts.force,
  });
  if (memo && memo.key === key) return memo.data;
  const promise = (async () => {
    const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
    return buildIntermediate({
      config,
      cacheDir: opts.cacheDir,
      force: opts.force,
    });
  })();
  memo = { key, data: promise };
  return promise;
}
