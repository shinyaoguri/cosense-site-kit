import { type CosenseBlock, mapBlockInlines } from "../schema/v1/block";
import type { InlineNode } from "../schema/v1/inline";
import type { CosenseSitePage } from "../schema/v1/page";

// After slugs are assigned, walk each page's blocks and resolve every pageLink
// node: set its slug if the target is a published page, and set exists.
// The titleToSlug map is shared with downstream link-data computation; pass it
// in to avoid rebuilding it.
export function resolveInternalLinks(
  pages: CosenseSitePage[],
  titleToSlug?: Map<string, string>,
): CosenseSitePage[] {
  const map = titleToSlug ?? buildTitleToSlug(pages);
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((b) => resolveBlock(b, map)),
  }));
}

// Cosense matches page links case-insensitively — `[foo]` in a body links to
// the page titled "Foo" — so lookups must go through the same normalization
// or links that work on Cosense silently break on the generated site.
export function titleKey(title: string): string {
  return title.toLowerCase();
}

export function buildTitleToSlug(
  pages: ReadonlyArray<{ title: string; slug: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  // First-wins on key collisions: Cosense itself treats case-variant titles
  // as one page, so collisions only occur for pathological inputs.
  for (const p of pages) {
    const key = titleKey(p.title);
    if (!map.has(key)) map.set(key, p.slug);
  }
  return map;
}

// Resolve pageLinks in every inline container — paragraph/heading/list plus
// quote and table cells — so a [Page] link works regardless of where it appears.
function resolveBlock(block: CosenseBlock, m: Map<string, string>): CosenseBlock {
  return mapBlockInlines(block, (c) => resolveInline(c, m));
}

function resolveInline(node: InlineNode, m: Map<string, string>): InlineNode {
  switch (node.type) {
    case "pageLink": {
      const slug = m.get(titleKey(node.title));
      return { type: "pageLink", title: node.title, slug, exists: slug !== undefined };
    }
    case "strong":
    case "emphasis":
    case "strikethrough":
      return { ...node, children: node.children.map((c) => resolveInline(c, m)) };
    case "link":
      return { ...node, children: node.children.map((c) => resolveInline(c, m)) };
    default:
      return node;
  }
}
