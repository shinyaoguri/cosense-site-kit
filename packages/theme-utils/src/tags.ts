// Tag classification used by themes when rendering inline tag nodes.
//
//   isHiddenTag  → omit entirely (publish/draft/...; framework control bits)
//   isPublicTag  → render as clickable chip linking to /tags/<name>
//   otherwise    → render as plain inline text (no chip), e.g. template/foo
//
// Cosense pages tend to carry a few control tags (#publish) and a few real
// categories (#diary). Themes want to keep the latter visible and clickable
// while hiding the former.

/** A page tagged `#no-date` renders without its publish/update dates. */
export const NO_DATE_TAG = "no-date";

const HIDDEN_CONTROL_TAGS = new Set([
  "publish",
  "draft",
  "private",
  "internal",
  NO_DATE_TAG,
]);

// Namespaced framework-metadata tags carry a value, not a category, so they
// should never render. #published/<date> and #updated/<date> set a page's
// display dates.
const HIDDEN_TAG_PREFIXES = ["published/", "updated/"];

export function isHiddenTag(name: string): boolean {
  return (
    HIDDEN_CONTROL_TAGS.has(name) ||
    HIDDEN_TAG_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

export function isPublicTag(name: string): boolean {
  return !name.includes("/") && !HIDDEN_CONTROL_TAGS.has(name);
}

/** Whether a page (by its tag list) opts out of showing publish/update dates. */
export function hidesDates(tags: string[]): boolean {
  return tags.includes(NO_DATE_TAG);
}
