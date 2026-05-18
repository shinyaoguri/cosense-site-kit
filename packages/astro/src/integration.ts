import type { AstroIntegration } from "astro";
import {
  normalizeBase,
  pathFor,
  type CosenseSiteConfig,
} from "@cosense-site-kit/core";
import { loadCosenseSiteConfig } from "./config-loader";
import { getSharedIntermediate } from "./intermediate-cache";

export interface CosenseIntegrationOptions {
  /** Path to cosense.config.{ts,js,mjs}. Default: ./cosense.config */
  configFile?: string;
  /** Pre-loaded config object. Takes priority over configFile. */
  config?: CosenseSiteConfig;
}

// Astro Integration. Use in astro.config.ts:
//
//   import cosense from "@cosense-site-kit/astro";
//   import theme from "@cosense-site-kit/theme-default";
//
//   export default defineConfig({
//     integrations: [
//       cosense({ configFile: "./cosense.config.ts" }),
//       theme(),
//     ],
//   });
//
// The integration sets Astro's `site` to the configured `baseUrl`, runs the
// fetch pipeline eagerly (its result is memoed for the content loaders), and
// translates structure.redirects from .site YAML into Astro's redirects map.
// Pipeline failure does not crash Astro — site is still set and redirects
// quietly skipped, so the dev server can come up even when offline.
// Virtual module ID exposed to themes and downstream consumers. Themes can
// import this without depending on @cosense-site-kit/astro at compile time;
// they ship their own .d.ts shim. The module emits the validated site block
// from cosense.config.ts so themes don't have to be told the title twice.
const SITE_VIRTUAL_ID = "virtual:cosense-site-kit/site";
const SITE_VIRTUAL_RESOLVED = `\0${SITE_VIRTUAL_ID}`;

function virtualSitePlugin(site: CosenseSiteConfig["site"]): {
  name: string;
  resolveId(id: string): string | null;
  load(id: string): string | null;
} {
  return {
    name: "cosense-site-kit-virtual-site",
    resolveId(id) {
      if (id === SITE_VIRTUAL_ID) return SITE_VIRTUAL_RESOLVED;
      return null;
    },
    load(id) {
      if (id === SITE_VIRTUAL_RESOLVED) {
        return `export default ${JSON.stringify(site)};`;
      }
      return null;
    },
  };
}

export default function cosense(opts: CosenseIntegrationOptions = {}): AstroIntegration {
  return {
    name: "@cosense-site-kit/astro",
    hooks: {
      "astro:config:setup": async ({ updateConfig, logger }) => {
        const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
        const normalized = normalizeBase(config.site.base);

        // updateConfig is invoked in narrow slices so each call types cleanly
        // against AstroConfig partials. Multi-call is supported and shallow-
        // merges in order.
        updateConfig({
          site: config.site.baseUrl,
          vite: { plugins: [virtualSitePlugin(config.site)] },
        });
        // Astro expects "/sub" (no trailing slash) or "/" for root.
        if (normalized !== "/") {
          updateConfig({ base: normalized.replace(/\/$/, "") });
        }

        try {
          const data = await getSharedIntermediate({
            configFile: opts.configFile,
            config: opts.config,
          });
          const redirects: Record<string, string> = {};
          for (const [from, to] of Object.entries(data.structure.redirects)) {
            redirects[pathFor(from)] = pathFor(to);
          }
          if (Object.keys(redirects).length > 0) {
            updateConfig({ redirects });
            logger.info(`cosense: ${Object.keys(redirects).length} redirect(s) wired`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`cosense: skipped redirects setup (${msg})`);
        }

        logger.info(
          `cosense: site=${config.site.baseUrl}, project=${config.source.project}`,
        );
      },
    },
  };
}
