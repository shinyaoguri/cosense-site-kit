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
    const base = computeSlug(page, routing.slug) || encodeTitle(page.title);
    let slug = base;
    let i = 2;
    while (used.has(slug)) {
      slug = `${base}-${i++}`;
    }
    used.add(slug);
    return { ...page, slug };
  });
}

function encodeTitle(title: string): string {
  // Cosense convention: spaces become underscores in URLs.
  return encodeURIComponent(title.replace(/\s+/g, "_"));
}

function slugifyAscii(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9-_/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
