import { join } from "node:path";
import {
  type CosenseSiteConfig,
  loadCosenseSiteConfig,
  normalizeBase,
  pageSchema,
  vendorIcons,
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
  /**
   * Surface excluded pages (drafts) for local preview, flagged `draft: true`.
   * Defaults to on in `astro dev` and off in `astro build` (drafts never leak
   * to a production build). Set explicitly to override the auto-detection.
   */
  previewDrafts?: boolean;
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
    async load({ store, logger, generateDigest, parseData, watcher }) {
      // Astro only passes a `watcher` in dev, so it's a reliable dev signal:
      // show drafts locally by default, never in a production build.
      const previewDrafts = opts.previewDrafts ?? Boolean(watcher);
      const built = await getSharedIntermediate({ ...opts, previewDrafts });
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

      // Diff against the persisted store instead of clear()-ing it: store.set
      // skips entries whose digest is unchanged, which is what makes Astro's
      // Content Layer incremental — clearing first would mark every page as
      // changed on every build. Entries whose page disappeared are deleted.
      const seen = new Set<string>();
      for (const page of data.pages) {
        const parsed = await parseData({
          id: page.slug,
          data: page as unknown as Record<string, unknown>,
        });
        seen.add(page.slug);
        store.set({
          id: page.slug,
          data: parsed,
          digest: generateDigest(parsed),
        });
      }
      for (const id of store.keys()) {
        if (!seen.has(id)) store.delete(id);
      }
    },
  };
}

export { pageSchema as cosenseSchema };
