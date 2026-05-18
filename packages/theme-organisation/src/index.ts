import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export interface ThemeOrgNavItem {
  label: string;
  page?: string;
  href?: string;
}

export interface ThemeOrgFooterColumn {
  heading: string;
  items: { label: string; page?: string; href?: string }[];
}

export interface ThemeOrganisationOptions {
  /** Site title shown in the header brand. Falls back to cosense.config.ts site.title. */
  siteTitle?: string;
  /** Default meta description. Falls back to cosense.config.ts site.description. */
  siteDescription?: string;
  /** Top-level header nav. Falls back to `.site` nav when empty. */
  nav?: ThemeOrgNavItem[];
  /** Cosense title to embed at the top of the home route. */
  homePage?: string;
  /** Hero headline copy for the home page. */
  heroHeadline?: string;
  /** Hero subhead copy for the home page. */
  heroSubhead?: string;
  /** Hero CTA button label. */
  heroCtaLabel?: string;
  /** Hero CTA destination (absolute or site-relative path). */
  heroCtaHref?: string;
  /** Tag identifying news / press-release pages. Default: "news". */
  newsTag?: string;
  /** Tag identifying case-study pages. Default: "case". */
  caseTag?: string;
  /** Tag identifying service pages. Default: "service". */
  serviceTag?: string;
  /** Multi-column footer (about / sitemap / legal). Optional. */
  footer?: ThemeOrgFooterColumn[];
  /** Copyright owner shown in the footer. Defaults to siteTitle. */
  copyrightHolder?: string;
}

const VIRTUAL_ID = "virtual:cosense-theme-organisation/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

export default function themeOrganisation(
  opts: ThemeOrganisationOptions = {},
): AstroIntegration {
  const options = {
    siteTitle: opts.siteTitle,
    siteDescription: opts.siteDescription,
    nav: opts.nav ?? [],
    homePage: opts.homePage,
    heroHeadline: opts.heroHeadline,
    heroSubhead: opts.heroSubhead,
    heroCtaLabel: opts.heroCtaLabel,
    heroCtaHref: opts.heroCtaHref,
    newsTag: opts.newsTag ?? "news",
    caseTag: opts.caseTag ?? "case",
    serviceTag: opts.serviceTag ?? "service",
    footer: opts.footer ?? [],
    copyrightHolder: opts.copyrightHolder,
  };

  return {
    name: "@cosense-site-kit/theme-organisation",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        updateConfig({
          vite: { plugins: [virtualOptionsPlugin(options)] },
        });

        const here = (p: string) =>
          fileURLToPath(new URL(`../src/${p}`, import.meta.url));

        injectRoute({ pattern: "/", entrypoint: here("templates/home.astro") });
        injectRoute({
          pattern: "/news",
          entrypoint: here("templates/news-index.astro"),
        });
        injectRoute({
          pattern: "/cases",
          entrypoint: here("templates/case-index.astro"),
        });
        injectRoute({
          pattern: "/services",
          entrypoint: here("templates/services-index.astro"),
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
    name: "cosense-theme-organisation-virtual-options",
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
