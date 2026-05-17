import type { CosenseSitePage } from "../schema/v1/page";

// Compute backlinks (titles of published pages that link to this page) and a
// slug-based link graph for navigation / visualization.
export function computeBacklinks(pages: CosenseSitePage[]): CosenseSitePage[] {
  const incoming = new Map<string, string[]>(); // target title -> source titles
  const titleToSlug = new Map<string, string>();
  for (const p of pages) titleToSlug.set(p.title, p.slug);

  for (const page of pages) {
    for (const target of page.links) {
      if (!titleToSlug.has(target)) continue;
      const list = incoming.get(target) ?? [];
      if (!list.includes(page.title)) list.push(page.title);
      incoming.set(target, list);
    }
  }

  return pages.map((p) => ({ ...p, backlinks: incoming.get(p.title) ?? [] }));
}

export function buildLinkGraph(pages: CosenseSitePage[]): Record<string, string[]> {
  const titleToSlug = new Map<string, string>();
  for (const p of pages) titleToSlug.set(p.title, p.slug);

  const graph: Record<string, string[]> = {};
  for (const page of pages) {
    const targets: string[] = [];
    for (const link of page.links) {
      const slug = titleToSlug.get(link);
      if (slug && !targets.includes(slug)) targets.push(slug);
    }
    graph[page.slug] = targets;
  }
  return graph;
}
