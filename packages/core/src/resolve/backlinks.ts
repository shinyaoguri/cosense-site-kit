import type { CosenseSitePage } from "../schema/v1/page";
import { buildTitleToSlug, titleKey } from "./links";

export interface LinkData {
  /** Pages with `backlinks` filled in (titles of pages that link to each). */
  pages: CosenseSitePage[];
  /** Slug-based directed graph: source slug → outgoing target slugs. */
  linkGraph: Record<string, string[]>;
}

// Single-pass computation of backlinks + slug-based link graph. Both derive
// from the same page.links walk and share a title→slug map, so fuse them
// rather than iterating three times (this used to be three separate passes
// each rebuilding the map).
export function resolveLinkData(
  pages: CosenseSitePage[],
  titleToSlug?: Map<string, string>,
): LinkData {
  const map = titleToSlug ?? buildTitleToSlug(pages);
  // Keyed by the target's slug (not the title as written): link targets are
  // matched case-insensitively, so "[home]" and "[Home]" must accumulate
  // backlinks on the same page.
  const incoming = new Map<string, string[]>(); // target slug → source titles
  const graph: Record<string, string[]> = {};

  for (const page of pages) {
    const outgoing: string[] = [];
    for (const target of page.links) {
      const slug = map.get(titleKey(target));
      if (slug === undefined) continue;
      const sources = incoming.get(slug) ?? [];
      if (!sources.includes(page.title)) sources.push(page.title);
      incoming.set(slug, sources);
      if (!outgoing.includes(slug)) outgoing.push(slug);
    }
    graph[page.slug] = outgoing;
  }

  return {
    pages: pages.map((p) => ({ ...p, backlinks: incoming.get(p.slug) ?? [] })),
    linkGraph: graph,
  };
}
