import { join } from "node:path";
import {
  loadCosenseSiteConfig,
  normalizeBase,
  pageSchema,
  vendorIcons,
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
    schema: pageSchema,
    async load({ store, logger, generateDigest, parseData }) {
      const built = await getSharedIntermediate(opts);
      logger.info(`Loaded ${built.pages.length} page(s); excluded ${built.excluded.length}`);
      for (const w of built.warnings) logger.warn(w);

      // Vendor `[name.icon]` images here, in the loader, because this is the
      // data that actually reaches the rendered pages. scrapbox.io's icon
      // endpoint serves with Cross-Origin-Resource-Policy: same-origin, so a
      // hot-linked <img> is blocked from the generated origin. We download each
      // icon and rewrite its src to a local copy under the site's public dir.
      // (Doing this in the integration instead doesn't work: content.config.ts
      // loads in a separate module realm, so the integration's result isn't
      // shared with this loader.)
      const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
      const base = normalizeBase(config.site.base).replace(/\/$/, "");
      const data = await vendorIcons(built, {
        dir: join(process.cwd(), "public", "cosense-icons"),
        baseUrl: `${base}/cosense-icons`,
        onWarn: (m) => logger.warn(m),
      });

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
