import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export interface ThemeLabNavItem {
  label: string;
  /** Cosense title to link to. */
  page?: string;
  /** Absolute URL or site-relative path (e.g. "/news"). */
  href?: string;
}

export interface ThemeLabOptions {
  /** Site title shown in the header. Falls back to cosense.config.ts site.title. */
  siteTitle?: string;
  /** Default meta description. Falls back to cosense.config.ts site.description. */
  siteDescription?: string;
  /** Header nav items. Falls back to .site `nav:` when empty. */
  nav?: ThemeLabNavItem[];
  /** Cosense title to embed at the top of the home route. */
  homePage?: string;
  /**
   * Tag that marks a Cosense page as a research topic. Pages with this tag
   * are listed on /research and rendered with the research-post template.
   * Default: "research".
   */
  researchTag?: string;
  /**
   * Tag that marks a Cosense page as a news / blog post. Pages with this
   * tag are listed on /news and rendered with the news-post template.
   * Default: "news".
   */
  newsTag?: string;
  /** Affiliation line shown in the footer (e.g. "Aichi Institute of Technology"). */
  affiliation?: string;
  /** Copyright owner shown in the footer. Defaults to siteTitle. */
  copyrightHolder?: string;
}

const VIRTUAL_ID = "virtual:cosense-theme-lab/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

export default function themeLab(opts: ThemeLabOptions = {}): AstroIntegration {
  const options = {
    siteTitle: opts.siteTitle,
    siteDescription: opts.siteDescription,
    nav: opts.nav ?? [],
    homePage: opts.homePage,
    researchTag: opts.researchTag ?? "research",
    newsTag: opts.newsTag ?? "news",
    affiliation: opts.affiliation,
    copyrightHolder: opts.copyrightHolder,
  };

  return {
    name: "@cosense-site-kit/theme-lab",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        updateConfig({
          vite: { plugins: [virtualOptionsPlugin(options)] },
        });

        const here = (p: string) =>
          fileURLToPath(new URL(`../src/${p}`, import.meta.url));

        injectRoute({ pattern: "/", entrypoint: here("templates/home.astro") });
        injectRoute({
          pattern: "/research",
          entrypoint: here("templates/research-index.astro"),
        });
        injectRoute({
          pattern: "/news",
          entrypoint: here("templates/news-index.astro"),
        });
        injectRoute({
          pattern: "/tags/[tag]",
          entrypoint: here("templates/tag.astro"),
        });
        injectRoute({
          pattern: "/[...slug]",
          entrypoint: here("templates/_dispatcher.astro"),
        });
      },
    },
  };
}

function virtualOptionsPlugin(options: unknown) {
  return {
    name: "cosense-theme-lab-virtual-options",
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
