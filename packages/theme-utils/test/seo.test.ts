import { describe, expect, it } from "vitest";
import { buildRssFeed } from "../src/feed";
import { buildRobotsTxt } from "../src/robots";
import { buildSitemap } from "../src/sitemap";
import { escapeXml } from "../src/xml";

describe("escapeXml", () => {
  it("escapes the five predefined entities without double-encoding", () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe("a &amp; b &lt; c &gt; d &quot; e &apos; f");
  });
});

describe("buildSitemap", () => {
  it("emits a urlset with loc and optional lastmod, escaping URLs", () => {
    const xml = buildSitemap([
      { loc: "https://x.test/a?b=1&c=2", lastmod: "2026-05-22T00:00:00.000Z" },
      { loc: "https://x.test/b" },
    ]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://x.test/a?b=1&amp;c=2</loc>");
    expect(xml).toContain("<lastmod>2026-05-22T00:00:00.000Z</lastmod>");
    // Second URL has no lastmod element.
    expect(xml).toContain("<loc>https://x.test/b</loc>");
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
  });
});

describe("buildRssFeed", () => {
  it("builds an RSS 2.0 channel with escaped items and RFC-822 dates", () => {
    const xml = buildRssFeed({
      title: "My & Site",
      description: "desc",
      siteUrl: "https://x.test/",
      feedUrl: "https://x.test/feed.xml",
      language: "ja",
      items: [
        {
          title: "Post <1>",
          link: "https://x.test/post-1",
          description: "hi",
          pubDate: "2026-05-22T00:00:00.000Z",
        },
      ],
    });
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<title>My &amp; Site</title>");
    expect(xml).toContain('<atom:link href="https://x.test/feed.xml" rel="self"');
    expect(xml).toContain("<title>Post &lt;1&gt;</title>");
    expect(xml).toContain('<guid isPermaLink="true">https://x.test/post-1</guid>');
    expect(xml).toContain("<pubDate>Fri, 22 May 2026 00:00:00 GMT</pubDate>");
  });

  it("omits pubDate for invalid dates", () => {
    const xml = buildRssFeed({
      title: "t",
      siteUrl: "https://x.test/",
      feedUrl: "https://x.test/feed.xml",
      items: [{ title: "a", link: "https://x.test/a", pubDate: "not-a-date" }],
    });
    expect(xml).not.toContain("<pubDate>");
  });
});

describe("buildRobotsTxt", () => {
  it("allows all and appends the sitemap when given", () => {
    expect(buildRobotsTxt({ sitemapUrl: "https://x.test/sitemap.xml" })).toBe(
      "User-agent: *\nAllow: /\nSitemap: https://x.test/sitemap.xml\n",
    );
  });

  it("omits the sitemap line when not given", () => {
    expect(buildRobotsTxt()).toBe("User-agent: *\nAllow: /\n");
  });
});
