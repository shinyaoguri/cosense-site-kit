// Tag classification used by themes when rendering inline tag nodes.
//
//   isHiddenTag  → omit entirely (publish/draft/...; framework control bits)
//   isPublicTag  → render as clickable chip linking to /tags/<name>
//   otherwise    → render as plain inline text (no chip), e.g. template/foo
//
// Cosense pages tend to carry a few control tags (#publish) and a few real
// categories (#diary). Themes want to keep the latter visible and clickable
// while hiding the former.

const HIDDEN_CONTROL_TAGS = new Set([
  "publish",
  "draft",
  "private",
  "internal",
]);

export function isHiddenTag(name: string): boolean {
  return HIDDEN_CONTROL_TAGS.has(name);
}

export function isPublicTag(name: string): boolean {
  return !name.includes("/") && !HIDDEN_CONTROL_TAGS.has(name);
}
