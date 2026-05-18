import { pageSchema, type CosenseSiteConfig } from "@cosense-site-kit/core";
import type { Loader } from "astro/loaders";
import { getSharedIntermediate } from "./intermediate-cache";

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

// Astro Content Loader for the published pages collection. Use it from
// src/content.config.ts:
//
//   const pages = defineCollection({
//     loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
//     schema: cosenseSchema,
//   });
//
// The parsed .site SiteStructure is NOT a content collection — it's a
// per-site singleton exposed via the virtual:cosense-site-kit/structure
// module from the cosense() Astro integration. Themes read it through
// loadStructure() in @cosense-site-kit/theme-utils.
export function cosenseLoader(opts: CosenseLoaderOptions = {}): Loader {
  return {
    name: "cosense-site-kit/pages",
    schema: () => pageSchema,
    async load({ store, logger, generateDigest, parseData }) {
      const data = await getSharedIntermediate(opts);
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

export { pageSchema as cosenseSchema };
