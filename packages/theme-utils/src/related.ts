import { isHiddenTag } from "./tags";

// Scrapbox's signature feature is the link network: its "related pages" panel
// surfaces 2-hop links — other pages that share a link target with the page
// you're reading (co-citation). The intermediate model already carries every
// page's outgoing `links`, so themes can rebuild this relation at render time
// without any extra core data. This module is the pure ranker; the loader
// (Related.astro) feeds it the published pages collection.

export interface RelatedCandidate {
  title: string;
  slug: string;
  /** Outgoing link targets (titles) for this page. */
  links: string[];
}

export interface RelatedPage {
  title: string;
  slug: string;
  /** How many link targets this page shares with the current page (2-hop strength). */
  shared: number;
}

const META_LINK_PREFIXES = ["template/", "slug/"];

// Cosense models hashtags as links, so `page.links` carries control/metadata
// tags (#publish, #template/foo, #slug/bar) alongside real topic links.
// Counting those as shared would make every published page "related" to every
// other one (they all carry #publish), so we drop them before measuring
// overlap. Reuses isHiddenTag for the control tags and adds the namespaced
// metadata prefixes that aren't real categories.
export function isStructuralLink(name: string): boolean {
  return isHiddenTag(name) || META_LINK_PREFIXES.some((p) => name.startsWith(p));
}

// Rank other pages by how many (non-structural) link targets they share with
// the current page, strongest first, ties broken alphabetically. Direct
// backlinks usually have their own panel, so callers pass them via `exclude`
// to keep the related list to genuine 2-hop discoveries.
export function relatedPages(
  currentLinks: string[],
  candidates: RelatedCandidate[],
  opts: { limit?: number; exclude?: Iterable<string> } = {},
): RelatedPage[] {
  const limit = opts.limit ?? 8;
  const exclude = new Set(opts.exclude ?? []);
  const current = new Set(currentLinks.filter((l) => !isStructuralLink(l)));
  if (current.size === 0) return [];

  const scored: RelatedPage[] = [];
  for (const candidate of candidates) {
    if (exclude.has(candidate.title)) continue;
    let shared = 0;
    const seen = new Set<string>();
    for (const link of candidate.links) {
      if (seen.has(link)) continue;
      seen.add(link);
      if (current.has(link)) shared++;
    }
    if (shared > 0) {
      scored.push({ title: candidate.title, slug: candidate.slug, shared });
    }
  }

  scored.sort((a, b) => b.shared - a.shared || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}
