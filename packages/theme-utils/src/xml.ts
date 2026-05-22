// Minimal XML text escaping for the hand-rolled sitemap/feed builders. Kept
// dependency-free (no @astrojs/rss) so themes don't pull a feed library; the
// trade-off is we must escape correctly ourselves, which is what this does.
// Escapes the five XML predefined entities. `&` first so we don't double-encode
// the entities we just introduced.
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
