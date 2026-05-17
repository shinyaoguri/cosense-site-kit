import type { CosenseBlock } from "../schema/v1/block";
import type { InlineNode } from "../schema/v1/inline";
import type { CosenseSitePage } from "../schema/v1/page";

// After slugs are assigned, walk each page's blocks and resolve every pageLink
// node: set its slug if the target is a published page, and set exists.
export function resolveInternalLinks(pages: CosenseSitePage[]): CosenseSitePage[] {
  const titleToSlug = new Map<string, string>();
  for (const p of pages) titleToSlug.set(p.title, p.slug);

  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((b) => resolveBlock(b, titleToSlug)),
  }));
}

function resolveBlock(block: CosenseBlock, m: Map<string, string>): CosenseBlock {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "list":
      return { ...block, children: block.children.map((c) => resolveInline(c, m)) };
    default:
      return block;
  }
}

function resolveInline(node: InlineNode, m: Map<string, string>): InlineNode {
  switch (node.type) {
    case "pageLink": {
      const slug = m.get(node.title);
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
