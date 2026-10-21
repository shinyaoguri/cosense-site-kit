// Single source of truth for URL safety at the validated-model boundary.
//
// `.site` and page content are remote input (anyone with project edit rights can
// write them), and Astro's attribute escaping cannot neutralize a `javascript:`
// href — so URL shapes are enforced here, on the intermediate model that themes
// consume. theme-utils re-uses these helpers instead of keeping its own copy, so
// the schema and the theme layer can't drift (they did: one allowed `tel:`, the
// other silently dropped it; one allowed protocol-relative `//host`, the other
// rejected it).

// Allowed hrefs: absolute http(s), mailto:/tel:, a site-relative path (/blog —
// but NOT protocol-relative //host, nor /\host, which browsers read the same
// way since they treat "\" as "/"), or a #fragment.
export const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?![/\\])|#)/i;

/** True when `href` uses an allowed, non-executable shape. */
export function isSafeHref(href: string): boolean {
  return SAFE_HREF.test(href);
}

/** Return `href` when safe, else undefined — for `safeHref(x) ?? "#"` fallbacks. */
export function safeHref(href: string | undefined): string | undefined {
  return href && SAFE_HREF.test(href) ? href : undefined;
}

// Redirect destinations are slugs or site-relative paths — never a scheme (no
// open redirects / `javascript:`) and never protocol-relative. Validated after
// trimming; browsers strip leading C0 controls and spaces before parsing a URL,
// so a value like "\t//evil" would pass a naive leading-anchor check yet resolve
// externally (a parser-differential). Reject control chars outright and match on
// the trimmed value.
const REDIRECT_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally reject C0/DEL controls that browsers strip before URL parsing
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/** True when `value` (expected pre-trimmed) is a safe redirect destination. */
export function isSafeRedirect(value: string): boolean {
  if (!value) return false;
  if (CONTROL_CHARS.test(value)) return false; // tab/newline/etc. → parser-differential
  if (value.startsWith("//")) return false; // protocol-relative → external host
  if (value.includes("\\")) return false; // browsers treat "\" as "/": "/\host" → external host
  if (REDIRECT_SCHEME.test(value)) return false; // http:, javascript:, data:, …
  return true;
}

// Redirect *sources* become build output paths: Astro writes each one to
// `<outDir>/<source>/index.html`, so a `..` segment would write outside the
// output directory. Sources are normalized to a slash-trimmed slug path
// ("/legacy/" → "legacy") and must consist of ordinary segments only.

/** Trim surrounding whitespace and slashes from a redirect source. */
export function normalizeRedirectSource(value: string): string {
  const s = value.trim();
  // Trim "/" by index — /^\/+|\/+$/ backtracks O(n²) on a run of slashes.
  let start = 0;
  let end = s.length;
  while (start < end && s.charCodeAt(start) === 47 /* "/" */) start++;
  while (end > start && s.charCodeAt(end - 1) === 47) end--;
  return s.slice(start, end);
}

/** True when `value` (expected pre-normalized) is a safe redirect source. */
export function isSafeRedirectSource(value: string): boolean {
  if (!value) return false;
  if (CONTROL_CHARS.test(value)) return false;
  if (value.includes("\\")) return false; // browsers and Windows paths treat "\" as "/"
  if (REDIRECT_SCHEME.test(value)) return false;
  return value.split("/").every((seg) => seg !== "" && seg !== "." && seg !== "..");
}
