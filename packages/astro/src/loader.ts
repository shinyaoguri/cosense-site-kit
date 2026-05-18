import {
  buildIntermediate,
  loadCosenseSiteConfig,
  pageSchema,
  siteStructureSchema,
  type CosenseSiteConfig,
  type IntermediateData,
} from "@cosense-site-kit/core";
import type { Loader } from "astro/loaders";

export interface CosenseLoaderOptions {
  /** Path to cosense.config.{ts,js,mjs}. Default: ./cosense.config */
  configFile?: string;
  /** Pre-loaded config object. Takes priority over configFile. */
  config?: CosenseSiteConfig;
  /** Override the cache directory. Default: .cosense-cache */
  cacheDir?: string;
  /** Force a full refetch ignoring the cache. */
  force?: boolean;
}

// Module-level memo so `cosenseLoader` and `cosenseSiteLoader` share a single
// pipeline run within one Astro build/dev process. Keyed by the loader-args
// JSON because the same dev server may host multiple sites in theory.
let memo: { key: string; data: Promise<IntermediateData> } | null = null;

async function getIntermediate(opts: CosenseLoaderOptions): Promise<IntermediateData> {
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

// Astro Content Loader for individual pages. Use inside src/content.config.ts:
//
//   const pages = defineCollection({
//     loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
//     schema: cosenseSchema,
//   });
export function cosenseLoader(opts: CosenseLoaderOptions = {}): Loader {
  return {
    name: "cosense-site-kit/pages",
    schema: () => pageSchema,
    async load({ store, logger, generateDigest, parseData }) {
      const data = await getIntermediate(opts);
      logger.info(`Loaded ${data.pages.length} page(s); excluded ${data.excluded.length}`);
      for (const w of data.warnings) logger.warn(w);

      store.clear();
      for (const page of data.pages) {
        const parsed = await parseData({
          id: page.slug,
          data: page as unknown as Record<string, unknown>,
        });
        store.set({
          id: page.slug,
          data: parsed,
          digest: generateDigest(parsed),
        });
      }
    },
  };
}

// Astro Content Loader for the SiteStructure. Produces a single entry with
// id="structure", which themes read via getEntry("site", "structure"):
//
//   const site = defineCollection({
//     loader: cosenseSiteLoader({ configFile: "./cosense.config.ts" }),
//     schema: cosenseSiteSchema,
//   });
export function cosenseSiteLoader(opts: CosenseLoaderOptions = {}): Loader {
  return {
    name: "cosense-site-kit/site",
    schema: () => siteStructureSchema,
    async load({ store, logger, generateDigest, parseData }) {
      const data = await getIntermediate(opts);
      logger.info(`SiteStructure loaded (nav=${data.structure.nav.length}, posts=${data.structure.posts ? "on" : "off"})`);

      store.clear();
      const parsed = await parseData({
        id: "structure",
        data: data.structure as unknown as Record<string, unknown>,
      });
      store.set({
        id: "structure",
        data: parsed,
        digest: generateDigest(parsed),
      });
    },
  };
}

export { pageSchema as cosenseSchema, siteStructureSchema as cosenseSiteSchema };
