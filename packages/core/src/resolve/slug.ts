import type { CosenseSiteConfig } from "../config";
import type { CosenseSitePage } from "../schema/v1/page";

const SLUG_TAG_PREFIX = "slug/";

// Compute a slug for a single page given a strategy. Does NOT enforce
// uniqueness — assignSlugs() handles collisions across the page set.
export function computeSlug(
  page: CosenseSitePage,
  strategy: CosenseSiteConfig["routing"]["slug"],
): string {
  switch (strategy) {
    case "title":
      return page.title;
    case "encoded-title":
      return encodeTitle(page.title);
    case "metadata-or-encoded-title": {
      const declared = page.tags
        .find((t) => t.startsWith(SLUG_TAG_PREFIX))
        ?.slice(SLUG_TAG_PREFIX.length);
      if (declared) return slugifyAscii(declared);
      return encodeTitle(page.title);
    }
  }
}

// Assign unique slugs to all pages. Duplicates get a numeric suffix (`-2`,
// `-3`, …) and are reported through onWarn — a collision means two titles
// produce the same URL, which the author almost certainly wants to know.
//
// Suffixes are assigned in (createdAt, id) order, NOT input order: the input
// follows the list API's updated-desc ordering, so order-dependent suffixes
// would silently swap the two pages' public URLs whenever either was edited.
export function assignSlugs(
  pages: CosenseSitePage[],
  routing: CosenseSiteConfig["routing"],
  onWarn?: (message: string) => void,
): CosenseSitePage[] {
  const withBase = pages.map((page) => ({
    page,
    base:
      hostSafeSlug(computeSlug(page, routing.slug)) ||
      hostSafeSlug(encodeTitle(page.title)) ||
      page.id,
  }));

  const order = [...withBase].sort(
    (a, b) =>
      (a.page.createdAt ?? "").localeCompare(b.page.createdAt ?? "") ||
      a.page.id.localeCompare(b.page.id),
  );

  const used = new Set<string>();
  const assigned = new Map<string, string>(); // page id → slug
  for (const { page, base } of order) {
    let slug = base;
    let i = 2;
    while (used.has(slug)) {
      slug = `${base}-${i++}`;
    }
    if (slug !== base) {
      onWarn?.(
        `slug collision: "${page.title}" also maps to "${base}"; assigned "${slug}" instead`,
      );
    }
    used.add(slug);
    assigned.set(page.id, slug);
  }

  return pages.map((page) => ({ ...page, slug: assigned.get(page.id) ?? page.slug }));
}

// Normalize an Astro-style base path to start and end with exactly one slash.
// "/cosense-site-kit", "cosense-site-kit/", "/cosense-site-kit/" → "/cosense-site-kit/"
// "/" or "" → "/"
export function normalizeBase(base: string): string {
  if (!base || base === "/") return "/";
  // Trim leading/trailing "/" by index — /^\/+|\/+$/ scans O(n²) on a string
  // of many slashes (ReDoS), which CodeQL flags.
  let start = 0;
  let end = base.length;
  while (start < end && base.charCodeAt(start) === 47 /* "/" */) start++;
  while (end > start && base.charCodeAt(end - 1) === 47) end--;
  const stripped = base.slice(start, end);
  return stripped ? `/${stripped}/` : "/";
}

// Build an absolute path for a slug. Encodes each path segment once so unicode
// and special characters survive without breaking `/` separators. When a base
// is given (Astro project-pages style "/cosense-site-kit"), it is prepended.
// Pass `import.meta.env.BASE_URL` from theme components — Astro fills that
// from the integration's site.base configuration.
export function pathFor(slug: string, base = "/"): string {
  const encoded = slug.split("/").map(encodeURIComponent).join("/");
  return `${normalizeBase(base)}${encoded}`;
}

// GitHub Pages (and most static hosts/CDNs) refuse to serve URL segments that
// begin with a dot — they look like hidden dotfiles — so a page titled ".foo"
// would 404 despite being generated. Strip leading dots from each path segment.
function hostSafeSlug(slug: string): string {
  return slug
    .split("/")
    .map((seg) => seg.replace(/^\.+/, ""))
    .join("/");
}

function encodeTitle(title: string): string {
  // Slugs are logical identifiers, not URL-ready strings. Themes URL-encode
  // each path segment once when building an href; this keeps unicode titles
  // readable inside the intermediate model and avoids double-encoding bugs.
  // Cosense convention: spaces become underscores.
  return title.replace(/\s+/g, "_");
}

function slugifyAscii(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9-_/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
