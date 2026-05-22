import { escapeXml } from "./xml";

export interface SitemapUrl {
  /** Absolute URL of the page. */
  loc: string;
  /** ISO timestamp of the last modification, if known. */
  lastmod?: string;
}

// Build a sitemap.xml body from a set of absolute URLs. Themes inject a
// `/sitemap.xml` endpoint that gathers the published pages (plus home / posts /
// tag indexes) and hands them here. Dependency-free so the theme doesn't need
// @astrojs/sitemap; the endpoint owns URL resolution, this owns the XML.
export function buildSitemap(urls: SitemapUrl[]): string {
  const entries = urls
    .map(({ loc, lastmod }) => {
      const lm = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lm}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
