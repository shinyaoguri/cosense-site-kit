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
  nav?: ThemeDefaultNavItem[];
  /** Name of the content collection to read. Default: "pages". */
  collection?: string;
  /** Page slug to use as the home page body. Default: render a list of pages. */
  homePage?: string;
}

const VIRTUAL_ID = "virtual:cosense-theme-default/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

export default function themeDefault(opts: ThemeDefaultOptions = {}): AstroIntegration {
  const options: Required<Pick<ThemeDefaultOptions, "collection">> & ThemeDefaultOptions = {
    collection: opts.collection ?? "pages",
    nav: opts.nav ?? [],
    homePage: opts.homePage,
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
        injectRoute({ pattern: "/", entrypoint: here("routes/index.astro") });
        injectRoute({ pattern: "/tags/[tag]", entrypoint: here("routes/tags/[tag].astro") });
        injectRoute({ pattern: "/[...slug]", entrypoint: here("routes/[...slug].astro") });
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
