// Tag classification used by themes when rendering inline tag nodes.
//
//   isHiddenTag  → omit entirely (publish/draft/...; framework control bits)
//   isPublicTag  → render as clickable chip linking to /tags/<name>
//   otherwise    → render as plain inline text (no chip), e.g. template/foo
//
// Cosense pages tend to carry a few control tags (#publish) and a few real
// categories (#diary). Themes want to keep the latter visible and clickable
// while hiding the former.
//
// Every match here is case-insensitive: Cosense collapses `#Publish`/`#publish`
// onto one tag, so a control tag written in any case must still be recognized
// (via normalizeKey, the same normalization core uses for links and titles).

import { normalizeKey } from "@cosense-site-kit/core";

/** A page tagged `#no-date` renders without its publish/update dates. */
export const NO_DATE_TAG = "no-date";

const HIDDEN_CONTROL_TAGS = new Set(["publish", "draft", "private", "internal", NO_DATE_TAG]);

// Namespaced framework-metadata tags carry a value, not a category, so they
// should never render. #published/<date> and #updated/<date> set a page's
// display dates.
const HIDDEN_TAG_PREFIXES = ["published/", "updated/"];

export function isHiddenTag(name: string): boolean {
  const key = normalizeKey(name);
  return (
    HIDDEN_CONTROL_TAGS.has(key) || HIDDEN_TAG_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

export function isPublicTag(name: string): boolean {
  return !name.includes("/") && !HIDDEN_CONTROL_TAGS.has(normalizeKey(name));
}

/** Whether a page (by its tag list) opts out of showing publish/update dates. */
export function hidesDates(tags: string[]): boolean {
  return hasTag(tags, NO_DATE_TAG);
}

/**
 * Whether `tags` contains `tag`, compared case-insensitively (Cosense treats
 * `#Blog` and `#blog` as one tag). Use this instead of `tags.includes(tag)`
 * whenever matching an author-configured tag such as `.site` `posts.tag`.
 */
export function hasTag(tags: string[], tag: string): boolean {
  const key = normalizeKey(tag);
  return tags.some((t) => normalizeKey(t) === key);
}
