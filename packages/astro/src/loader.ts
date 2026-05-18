import {
  pageSchema,
  siteStructureSchema,
  type CosenseSiteConfig,
} from "@cosense-site-kit/core";
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
      const data = await getSharedIntermediate(opts);
      logger.info(
        `SiteStructure loaded (nav=${data.structure.nav.length}, posts=${data.structure.posts ? "on" : "off"})`,
      );

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
