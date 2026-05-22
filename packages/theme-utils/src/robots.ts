// Build a robots.txt body. Allows everything and points crawlers at the
// sitemap. Themes inject a `/robots.txt` endpoint that resolves the absolute
// sitemap URL and calls this.
export function buildRobotsTxt(opts: { sitemapUrl?: string } = {}): string {
  const lines = ["User-agent: *", "Allow: /"];
  if (opts.sitemapUrl) lines.push(`Sitemap: ${opts.sitemapUrl}`);
  return `${lines.join("\n")}\n`;
}
