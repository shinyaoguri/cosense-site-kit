import {
  buildIntermediate,
  loadCosenseSiteConfig,
  type CosenseSiteConfig,
  type IntermediateData,
} from "@cosense-site-kit/core";

export interface SharedIntermediateOptions {
  configFile?: string;
  config?: CosenseSiteConfig;
  cacheDir?: string;
  force?: boolean;
}

// Module-level memo so the cosense() integration and both content loaders
// share a single buildIntermediate() invocation per process. Keyed on the
// loader-args JSON so multiple sites in one Astro install stay isolated.
let memo: { key: string; data: Promise<IntermediateData> } | null = null;

export function getSharedIntermediate(
  opts: SharedIntermediateOptions,
): Promise<IntermediateData> {
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
