import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export interface ThemeDefaultNavItem {
  label: string;
  /** A slug to link to, e.g. "research". */
  page?: string;
  /** Absolute or external href. */
  href?: string;
}

export interface ThemeDefaultOptions {
  /**
   * Text shown as the site title in the header. Defaults to
   * cosense.config.ts site.title via virtual:cosense-site-kit/site, then to
   * Astro's configured site hostname.
   */
  siteTitle?: string;
  /** Fallback nav items used when `.site` declares no `nav:`. */
  nav?: ThemeDefaultNavItem[];
  /** Page slug to use as the home page body. Default: render a list of pages. */
  homePage?: string;
  /**
   * Copyright holder shown in the footer after "© <year>". Defaults to
   * cosense.config.ts site.title. Set this to display a different name (e.g.
   * an organization) without changing the header site title.
   */
  copyright?: string;
  /** When set, the copyright holder is rendered as a link to this URL. */
  copyrightUrl?: string;
}

const VIRTUAL_ID = "virtual:cosense-theme-default/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

export default function themeDefault(opts: ThemeDefaultOptions = {}): AstroIntegration {
  const options: Required<Pick<ThemeDefaultOptions, "nav">> & ThemeDefaultOptions = {
    nav: opts.nav ?? [],
    homePage: opts.homePage,
    siteTitle: opts.siteTitle,
    copyright: opts.copyright,
    copyrightUrl: opts.copyrightUrl,
  };

  return {
    name: "@cosense-site-kit/theme-default",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [virtualOptionsPlugin(options)],
          },
        });

        // .astro/.css files ship as raw src/ (not bundled by tsup), so resolve
        // from the built index.js up one level into src/.
        const here = (p: string) => fileURLToPath(new URL(`../src/${p}`, import.meta.url));
        // Fixed-route templates: each owns a known URL.
        injectRoute({ pattern: "/", entrypoint: here("templates/home.astro") });
        injectRoute({ pattern: "/posts", entrypoint: here("templates/archive.astro") });
        injectRoute({ pattern: "/tags/[tag]", entrypoint: here("templates/tag.astro") });
        // Dispatcher: serves /<slug> and picks the right per-page template
        // (templates/page.astro by default, others via #template/<name>).
        injectRoute({ pattern: "/[...slug]", entrypoint: here("templates/_dispatcher.astro") });
      },
    },
  };
}

function virtualOptionsPlugin(options: ThemeDefaultOptions) {
  return {
    name: "cosense-theme-default-virtual-options",
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return VIRTUAL_RESOLVED;
      return null;
    },
    load(id: string) {
      if (id === VIRTUAL_RESOLVED) {
        return `export default ${JSON.stringify(options)};`;
      }
      return null;
    },
  };
}
