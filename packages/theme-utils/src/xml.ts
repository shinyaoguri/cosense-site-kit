// Minimal XML text escaping for the hand-rolled sitemap/feed builders. Kept
// dependency-free (no @astrojs/rss) so themes don't pull a feed library; the
// trade-off is we must escape correctly ourselves, which is what this does.
// Escapes the five XML predefined entities. `&` first so we don't double-encode
// the entities we just introduced.
export function escapeXml(value: string): string {
  return (
    value
      // Drop C0 control chars XML 1.0 forbids outright (keep TAB/LF/CR). Left in,
      // a stray control char from a title makes feed.xml/sitemap.xml non-well-
      // formed and readers/crawlers reject the whole document.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally stripping XML-1.0-invalid control chars
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}
