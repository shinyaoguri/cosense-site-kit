import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export interface ThemePortfolioNavItem {
  label: string;
  /** Cosense title to link to, resolved to its slug at render time. */
  page?: string;
  /** Absolute or external href. */
  href?: string;
}

export interface ThemePortfolioOptions {
  /**
   * Text shown as the site title in the header. Falls back to
   * cosense.config.ts site.title via virtual:cosense-site-kit/site, then to
   * the configured site hostname.
   */
  siteTitle?: string;
  /** Tagline shown under the site title in the header (optional). */
  siteTagline?: string;
  /** Description used as the default <meta name="description">. */
  siteDescription?: string;
  /** Header nav items. Falls back to .site `nav:` when empty. */
  nav?: ThemePortfolioNavItem[];
  /** Name of the content collection to read. Default: "pages". */
  collection?: string;
  /**
   * Page slug or title to embed at the top of the home route. When unset,
   * falls back to `.site` `home.page`, then to a minimal greeting.
   */
  homePage?: string;
  /**
   * Tag that marks a Cosense page as a blog post. Pages with this tag are
   * (a) listed on the blog index, and (b) rendered with the blog-post
   * template instead of the default page template.
   * Default: "blog".
   */
  blogTag?: string;
  /**
   * URL path for the blog index. Default: "/blog". The path must start with
   * a slash; the theme injects this route into Astro.
   */
  blogRoute?: string;
  /** Copyright owner shown in the footer. Defaults to siteTitle. */
  copyrightHolder?: string;
}

const VIRTUAL_ID = "virtual:cosense-theme-portfolio/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

export default function themePortfolio(
  opts: ThemePortfolioOptions = {},
): AstroIntegration {
  const blogRoute = opts.blogRoute ?? "/blog";
  if (!blogRoute.startsWith("/")) {
    throw new Error(
      `theme-portfolio: blogRoute must start with "/" (got "${blogRoute}")`,
    );
  }
  const options = {
    siteTitle: opts.siteTitle,
    siteTagline: opts.siteTagline,
    siteDescription: opts.siteDescription,
    nav: opts.nav ?? [],
    collection: opts.collection ?? "pages",
    homePage: opts.homePage,
    blogTag: opts.blogTag ?? "blog",
    blogRoute,
    copyrightHolder: opts.copyrightHolder,
  };

  return {
    name: "@cosense-site-kit/theme-portfolio",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [virtualOptionsPlugin(options)],
          },
        });

        // .astro/.css files aren't bundled by tsup; resolve from dist/index.js
        // up one level into src/ so injectRoute can find them.
        const here = (p: string) =>
          fileURLToPath(new URL(`../src/${p}`, import.meta.url));

        injectRoute({ pattern: "/", entrypoint: here("templates/home.astro") });
        injectRoute({
          pattern: blogRoute,
          entrypoint: here("templates/blog-index.astro"),
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
    name: "cosense-theme-portfolio-virtual-options",
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
