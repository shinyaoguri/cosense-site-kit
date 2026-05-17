import type { AstroIntegration } from "astro";
import type { CosenseSiteConfig } from "@cosense-site-kit/core";
import { loadCosenseSiteConfig } from "./config-loader";

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
// The integration sets Astro's `site` to the configured `baseUrl` so that
// sitemap/RSS helpers and absolute-URL utilities work out of the box.
// Themes are added explicitly to keep composition transparent.
export default function cosense(opts: CosenseIntegrationOptions = {}): AstroIntegration {
  return {
    name: "@cosense-site-kit/astro",
    hooks: {
      "astro:config:setup": async ({ updateConfig, logger }) => {
        const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
        updateConfig({ site: config.site.baseUrl });
        logger.info(
          `cosense: site=${config.site.baseUrl}, project=${config.source.project}`,
        );
      },
    },
  };
}
