import { escapeXml } from "./xml";

export interface FeedItem {
  title: string;
  /** Absolute URL of the item. */
  link: string;
  description?: string;
  /** ISO timestamp; emitted as an RFC-822 pubDate. */
  pubDate?: string;
}

export interface FeedOptions {
  title: string;
  description?: string;
  /** Absolute site URL (the channel link). */
  siteUrl: string;
  /** Absolute URL of the feed itself (atom:link rel=self). */
  feedUrl: string;
  language?: string;
  items: FeedItem[];
}

// RFC-822 date for RSS <pubDate>. Invalid/absent input yields undefined so the
// element is omitted rather than emitting "Invalid Date".
function rfc822(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toUTCString();
}

// Build an RSS 2.0 feed. Hand-rolled (no @astrojs/rss) to keep themes free of a
// feed dependency; all text is escaped via escapeXml. Themes inject a
// `/feed.xml` endpoint that selects the posts and resolves absolute links.
export function buildRssFeed(opts: FeedOptions): string {
  const channelMeta = [
    `    <title>${escapeXml(opts.title)}</title>`,
    `    <link>${escapeXml(opts.siteUrl)}</link>`,
    opts.description ? `    <description>${escapeXml(opts.description)}</description>` : null,
    opts.language ? `    <language>${escapeXml(opts.language)}</language>` : null,
    `    <atom:link href="${escapeXml(opts.feedUrl)}" rel="self" type="application/rss+xml" />`,
  ]
    .filter(Boolean)
    .join("\n");

  const items = opts.items
    .map((item) => {
      const pubDate = rfc822(item.pubDate);
      const lines = [
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
        item.description ? `      <description>${escapeXml(item.description)}</description>` : null,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
      ].filter(Boolean);
      return `    <item>\n${lines.join("\n")}\n    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n${channelMeta}\n${items}\n  </channel>\n</rss>\n`;
}
