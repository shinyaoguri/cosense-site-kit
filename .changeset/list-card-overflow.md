---
"@cosense-site-kit/theme-default": minor
---

feat(theme-default): keep list cards a stable size when any field overflows

Tunes the article-list cards (home "Recent", `/posts`, and tag pages) so no
single oversized field changes a card's footprint:

- **Summary** now uses up to two lines (was one) before an ellipsis — a longer
  excerpt is allowed, but it can't grow the card without bound.
- **Title** still clips to a single line with an ellipsis.
- **Tags** fit to the card width: a new `EntryTags` component renders every
  public tag on one line, and a small client script measures how many fit the
  card's current width, hides the overflow, and labels a `+N` badge with the
  remainder (recomputing on resize and after web fonts load). So the row shows as
  many tags as fit rather than a fixed count. With no JS the row simply clips to
  one line — the card keeps its height either way.

`EntryTags` replaces the inline tag markup the three list templates duplicated.
