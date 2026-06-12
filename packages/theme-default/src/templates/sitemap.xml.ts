import { getCollection } from "astro:content";
import type { CosenseSitePage } from "@cosense-site-kit/core";
import {
  buildSitemap,
  isPublicTag,
  loadStructure,
  path,
  type SitemapUrl,
} from "@cosense-site-kit/theme-utils";
import type { APIContext } from "astro";

// /sitemap.xml — every published page plus the home, /posts and tag indexes.
// Self-contained (no @astrojs/sitemap); lastmod uses the page's resolved
// modified date so crawlers see real change times.
export async function GET(context: APIContext): Promise<Response> {
  const base = context.site;
  const abs = (p: string) => (base ? new URL(p, base).href : p);

  // getCollection is untyped under tsc (real types come from `astro sync`).
  const pages = (await getCollection("pages")) as { data: CosenseSitePage }[];
  const urls: SitemapUrl[] = [{ loc: abs(path("")) }];

  for (const entry of pages) {
    urls.push({
      loc: abs(path(entry.data.slug)),
      lastmod: entry.data.modifiedAt ?? entry.data.publishedAt,
    });
  }

  // /posts exists only when the site declares a posts tag.
  const structure = await loadStructure();
  if (structure.posts?.tag) urls.push({ loc: abs(path("posts")) });

  // Tag index pages (skip namespaced metadata tags like template/foo).
  const tags = new Set<string>();
  for (const entry of pages) {
    for (const tag of entry.data.tags) if (isPublicTag(tag)) tags.add(tag);
  }
  for (const tag of tags) urls.push({ loc: abs(path(`tags/${tag}`)) });

  return new Response(buildSitemap(urls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
