import {
  buildIntermediate,
  pageSchema,
  type CosenseSiteConfig,
} from "@cosense-site-kit/core";
import type { Loader } from "astro/loaders";
import { loadCosenseSiteConfig } from "./config-loader";

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

// Astro Content Loader. Use inside src/content.config.ts:
//
//   import { defineCollection } from "astro:content";
//   import { cosenseLoader, cosenseSchema } from "@cosense-site-kit/astro";
//
//   const pages = defineCollection({
//     loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
//     schema: cosenseSchema,
//   });
//
//   export const collections = { pages };
export function cosenseLoader(opts: CosenseLoaderOptions = {}): Loader {
  return {
    name: "cosense-site-kit",
    schema: () => pageSchema,

    async load({ store, logger, generateDigest, parseData }) {
      const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));

      logger.info(`Fetching pages from project "${config.source.project}"`);
      const data = await buildIntermediate({
        config,
        cacheDir: opts.cacheDir,
        force: opts.force,
      });

      logger.info(
        `Loaded ${data.pages.length} page(s); excluded ${data.excluded.length}`,
      );

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
