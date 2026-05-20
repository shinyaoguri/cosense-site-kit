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

// Assign unique slugs to all pages, mutating each page.slug. Duplicates get a
// numeric suffix (`-2`, `-3`, …). Pages are processed in input order so the
// first occurrence keeps the bare slug.
export function assignSlugs(
  pages: CosenseSitePage[],
  routing: CosenseSiteConfig["routing"],
): CosenseSitePage[] {
  const used = new Set<string>();
  return pages.map((page) => {
    const base =
      hostSafeSlug(computeSlug(page, routing.slug)) ||
      hostSafeSlug(encodeTitle(page.title)) ||
      page.id;
    let slug = base;
    let i = 2;
    while (used.has(slug)) {
      slug = `${base}-${i++}`;
    }
    used.add(slug);
    return { ...page, slug };
  });
}

// Normalize an Astro-style base path to start and end with exactly one slash.
// "/cosense-site-kit", "cosense-site-kit/", "/cosense-site-kit/" → "/cosense-site-kit/"
// "/" or "" → "/"
export function normalizeBase(base: string): string {
  if (!base || base === "/") return "/";
  const stripped = base.replace(/^\/+|\/+$/g, "");
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
