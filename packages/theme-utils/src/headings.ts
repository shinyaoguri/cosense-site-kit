import type { InlineNode } from "@cosense-site-kit/core";

// Plain-text content of an inline run — used to derive a heading's anchor id
// from its text (so the id is stable across edits and shareable, unlike a
// runtime "heading-N" counter that shifts when a heading is added/removed).
export function headingText(nodes: InlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code" || node.type === "formula") out += node.value;
    else if (node.type === "pageLink") out += node.title;
    else if (node.type === "tag") out += node.name;
    else if ("children" in node) out += headingText(node.children);
  }
  return out;
}

// Slugify heading text into a URL-fragment-safe id. Keeps unicode letters and
// numbers (Japanese headings stay readable), lowercases, and collapses
// whitespace/punctuation to single hyphens.
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Assign a stable, unique id to each heading in document order. Duplicate slugs
// get a numeric suffix (`-2`, `-3`, …); an empty slug falls back to "section".
// Returns a Map keyed by the heading node reference.
export function assignHeadingIds<T extends { children: InlineNode[] }>(
  headings: T[],
): Map<T, string> {
  const ids = new Map<T, string>();
  const used = new Set<string>();
  for (const heading of headings) {
    const base = slugifyHeading(headingText(heading.children)) || "section";
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    ids.set(heading, id);
  }
  return ids;
}
