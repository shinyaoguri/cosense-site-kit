import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

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
  /**
   * Visual skin. A preset recolors the theme by overriding the `:root` CSS
   * custom properties (and optionally fonts) — no new templates. Its `options`
   * act as defaults; options passed directly here win. See `presetDark`.
   */
  preset?: ThemeDefaultPreset;
}

/**
 * A skin for theme-default: pure data, no new .astro. Recolors the theme by
 * overriding the design tokens declared in styles/global.css `:root`.
 */
export interface ThemeDefaultPreset {
  /** Identifier (e.g. "dark"). Informational; surfaced to a future catalog. */
  name?: string;
  /** CSS custom property overrides, e.g. `{ "--color-bg": "#191919" }`. */
  tokens?: Record<string, string>;
  /** Sets `<html>` color-scheme so native UI (scrollbars, form fields) matches. */
  colorScheme?: "light" | "dark";
  /** Replace the built-in M PLUS font stylesheet. Pair with `--font-*` tokens. */
  fontHref?: string;
  /** Default theme options the preset ships with; explicit options override. */
  options?: Omit<ThemeDefaultOptions, "preset">;
}

/** Shape injected into templates via virtual:cosense-theme-default/options. */
export interface ThemeDefaultRuntimeOptions {
  nav: ThemeDefaultNavItem[];
  homePage?: string;
  siteTitle?: string;
  copyright?: string;
  copyrightUrl?: string;
  tokens: Record<string, string>;
  colorScheme?: "light" | "dark";
  fontHref?: string;
}

const VIRTUAL_ID = "virtual:cosense-theme-default/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

// Merge user options with the chosen preset. Explicit options win; the preset's
// own options fill the gaps. tokens/colorScheme/fontHref come from the preset.
// Pure and exported so it can be unit-tested without spinning up Astro.
export function resolveThemeOptions(opts: ThemeDefaultOptions = {}): ThemeDefaultRuntimeOptions {
  const base = opts.preset?.options ?? {};
  return {
    nav: opts.nav ?? base.nav ?? [],
    homePage: opts.homePage ?? base.homePage,
    siteTitle: opts.siteTitle ?? base.siteTitle,
    copyright: opts.copyright ?? base.copyright,
    copyrightUrl: opts.copyrightUrl ?? base.copyrightUrl,
    tokens: opts.preset?.tokens ?? {},
    colorScheme: opts.preset?.colorScheme,
    fontHref: opts.preset?.fontHref,
  };
}

export default function themeDefault(opts: ThemeDefaultOptions = {}): AstroIntegration {
  const options = resolveThemeOptions(opts);

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

function virtualOptionsPlugin(options: ThemeDefaultRuntimeOptions) {
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

export { type ActiveSkin, PRESETS, resolveActiveSkin } from "./presets";
export { presetDark } from "./presets/dark";
