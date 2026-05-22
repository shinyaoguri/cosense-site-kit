import { join } from "node:path";
import {
  type CosenseSiteConfig,
  emptySiteStructure,
  loadCosenseSiteConfig,
  normalizeBase,
  pathFor,
  type SiteStructure,
  vendorImage,
} from "@cosense-site-kit/core";
import type { AstroIntegration } from "astro";
import { getSharedIntermediate } from "./intermediate-cache";

export interface CosenseIntegrationOptions {
  /** Path to cosense.config.{ts,js,mjs}. Default: ./cosense.config */
  configFile?: string;
  /** Pre-loaded config object. Takes priority over configFile. */
  config?: CosenseSiteConfig;
  /**
   * Surface excluded pages (drafts) for local preview. Defaults to on in
   * `astro dev`, off in `astro build`. Set explicitly to override. Must match
   * the loader's setting so both reuse the same shared pipeline result.
   */
  previewDrafts?: boolean;
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
// The integration:
//   1. Sets Astro's `site` and `base` from cosense.config.ts.
//   2. Runs the fetch pipeline (memoed; the pages loader reuses the result).
//   3. Exposes two virtual modules to themes:
//        virtual:cosense-site-kit/site       — the site block from config,
//                                              plus a vendored `icon` (favicon)
//        virtual:cosense-site-kit/structure  — the parsed .site SiteStructure
//   4. Wires redirects from .site into Astro's `redirects` config.
//
// Pipeline failure does not crash Astro — site/base are still set, structure
// falls back to empty defaults, and redirects are silently skipped so the dev
// server can come up even when Cosense is offline.

const SITE_VIRTUAL_ID = "virtual:cosense-site-kit/site";
const SITE_VIRTUAL_RESOLVED = `\0${SITE_VIRTUAL_ID}`;
const STRUCTURE_VIRTUAL_ID = "virtual:cosense-site-kit/structure";
const STRUCTURE_VIRTUAL_RESOLVED = `\0${STRUCTURE_VIRTUAL_ID}`;

interface VirtualSnapshot {
  site: CosenseSiteConfig["site"] & { icon?: string };
  structure: SiteStructure;
}

function virtualSitePlugin(getSnapshot: () => VirtualSnapshot): {
  name: string;
  resolveId(id: string): string | null;
  load(id: string): string | null;
} {
  return {
    name: "cosense-site-kit-virtual",
    resolveId(id) {
      if (id === SITE_VIRTUAL_ID) return SITE_VIRTUAL_RESOLVED;
      if (id === STRUCTURE_VIRTUAL_ID) return STRUCTURE_VIRTUAL_RESOLVED;
      return null;
    },
    load(id) {
      if (id === SITE_VIRTUAL_RESOLVED) {
        return `export default ${JSON.stringify(getSnapshot().site)};`;
      }
      if (id === STRUCTURE_VIRTUAL_RESOLVED) {
        return `export default ${JSON.stringify(getSnapshot().structure)};`;
      }
      return null;
    },
  };
}

export default function cosense(opts: CosenseIntegrationOptions = {}): AstroIntegration {
  return {
    name: "@cosense-site-kit/astro",
    hooks: {
      "astro:config:setup": async ({ updateConfig, logger, command }) => {
        const config = opts.config ?? (await loadCosenseSiteConfig(opts.configFile));
        const normalized = normalizeBase(config.site.base);
        // Match the loader's draft default (on in dev) so both share one
        // pipeline run; structure itself doesn't depend on drafts.
        const previewDrafts = opts.previewDrafts ?? command === "dev";

        // The virtual:cosense-site-kit/structure module needs a SiteStructure
        // at module-load time. We compute it eagerly here (memoed across the
        // process) so dev-mode reloads see fresh data without an extra fetch.
        // Empty fallback keeps the dev server alive when Cosense is offline.
        let structure: SiteStructure = emptySiteStructure();
        let icon: string | undefined;
        try {
          const data = await getSharedIntermediate({
            configFile: opts.configFile,
            config: opts.config,
            previewDrafts,
          });
          structure = data.structure;
          icon = data.site.icon;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`cosense: pipeline failed (${msg}); using empty structure`);
        }

        // Vendor the favicon locally — same reason as in-page icons: scrapbox.io
        // serves with Cross-Origin-Resource-Policy: same-origin, so hot-linking
        // it from the generated origin can be blocked. Resolved here because the
        // integration owns the virtual:cosense-site-kit/site module a theme reads.
        if (icon) {
          const assetBase = normalized.replace(/\/$/, "");
          icon = await vendorImage(icon, {
            dir: join(process.cwd(), "public", "cosense-icons"),
            baseUrl: `${assetBase}/cosense-icons`,
            onWarn: (m) => logger.warn(m),
          });
        }

        const site = { ...config.site, icon };
        updateConfig({
          site: config.site.baseUrl,
          vite: {
            plugins: [virtualSitePlugin(() => ({ site, structure }))],
          },
          // Permit astro:assets on remote images (content comes from arbitrary
          // image hosts: Gyazo, Scrapbox uploads, etc.). Inert by default — the
          // theme serves <img> directly; this only enables <Image> for themes
          // that opt into build-time optimization. See docs/THEMES.md.
          image: { remotePatterns: [{ protocol: "https" }] },
        });
        if (normalized !== "/") {
          updateConfig({ base: normalized.replace(/\/$/, "") });
        }

        const redirects: Record<string, string> = {};
        for (const [from, to] of Object.entries(structure.redirects)) {
          redirects[pathFor(from)] = pathFor(to);
        }
        if (Object.keys(redirects).length > 0) {
          updateConfig({ redirects });
          logger.info(`cosense: ${Object.keys(redirects).length} redirect(s) wired`);
        }

        logger.info(`cosense: site=${config.site.baseUrl}, project=${config.source.project}`);
      },
    },
  };
}
