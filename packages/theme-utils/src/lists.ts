import type { InlineNode } from "@cosense-site-kit/core";

// The parser emits one `list` block per line, each carrying a `depth` (1-based
// nesting level) and an `ordered` flag. Rendered naively that produces a
// separate <ul> per item with no real nesting. buildListTree folds a run of
// consecutive list blocks back into a tree so a theme can render proper nested
// <ul>/<ol>. Pure (no Astro) so it can be unit-tested.

export interface FlatListItem {
  depth: number;
  ordered?: boolean;
  children: InlineNode[];
}

export interface ListTreeItem {
  ordered: boolean;
  children: InlineNode[];
  items: ListTreeItem[];
}

export function buildListTree(flat: FlatListItem[]): ListTreeItem[] {
  const roots: ListTreeItem[] = [];
  // stack[i] is the most recent open item at that nesting level.
  const stack: { depth: number; node: ListTreeItem }[] = [];

  for (const item of flat) {
    const node: ListTreeItem = {
      ordered: item.ordered === true,
      children: item.children,
      items: [],
    };
    // Pop until the top is strictly shallower than this item — that's its parent.
    let top = stack[stack.length - 1];
    while (top && top.depth >= item.depth) {
      stack.pop();
      top = stack[stack.length - 1];
    }
    if (top) top.node.items.push(node);
    else roots.push(node);
    stack.push({ depth: item.depth, node });
  }

  return roots;
}
