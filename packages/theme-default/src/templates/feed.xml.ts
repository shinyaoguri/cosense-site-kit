import { getCollection } from "astro:content";
import site from "virtual:cosense-site-kit/site";
import type { CosenseSitePage } from "@cosense-site-kit/core";
import { buildRssFeed, type FeedItem, loadStructure, path } from "@cosense-site-kit/theme-utils";
import type { APIContext } from "astro";

// /feed.xml — RSS 2.0 of the posts (the `.site` posts tag), newest first. When
// the site declares no posts tag the channel is valid but empty.
export async function GET(context: APIContext): Promise<Response> {
  const base = context.site;
  const abs = (p: string) => (base ? new URL(p, base).href : p);

  const structure = await loadStructure();
  const postTag = structure.posts?.tag;
  // getCollection is untyped under tsc (real types come from `astro sync`),
  // so pin the entry shape to the intermediate page model.
  const pages = (await getCollection("pages")) as { data: CosenseSitePage }[];
  const posts = postTag
    ? pages
        .filter((e) => e.data.tags.includes(postTag))
        .sort((a, b) => (b.data.publishedAt ?? "").localeCompare(a.data.publishedAt ?? ""))
    : [];

  const items: FeedItem[] = posts.map((e) => ({
    title: e.data.title,
    link: abs(path(e.data.slug)),
    description: e.data.summary,
    pubDate: e.data.publishedAt,
  }));

  return new Response(
    buildRssFeed({
      title: site?.title ?? base?.hostname ?? "Feed",
      description: site?.description,
      siteUrl: abs(path("")),
      feedUrl: abs(path("feed.xml")),
      language: site?.lang,
      items,
    }),
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
}
