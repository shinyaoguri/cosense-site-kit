import type { AstroIntegration } from "astro";
import { pathFor, type CosenseSiteConfig } from "@cosense-site-kit/core";
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
export default function cosense(opts: CosenseIntegrationOptions = {}): AstroIntegration {
  return {
    name: "@cosense-site-kit/astro",
    hooks: {
      "astro:config:setup": async ({ updateConfig, logger }) => {
        const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
        const baseUpdate: { site: string; redirects?: Record<string, string> } = {
          site: config.site.baseUrl,
        };

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
            baseUpdate.redirects = redirects;
            logger.info(`cosense: ${Object.keys(redirects).length} redirect(s) wired`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`cosense: skipped redirects setup (${msg})`);
        }

        updateConfig(baseUpdate);
        logger.info(
          `cosense: site=${config.site.baseUrl}, project=${config.source.project}`,
        );
      },
    },
  };
}
