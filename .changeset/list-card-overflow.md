---
"@cosense-site-kit/theme-default": minor
---

feat(theme-default): keep list cards a stable size when any field overflows

Tunes the article-list cards (home "Recent", `/posts`, and tag pages) so no
single oversized field changes a card's footprint:

- **Summary** now uses up to two lines (was one) before an ellipsis — a longer
  excerpt is allowed, but it can't grow the card without bound.
- **Title** still clips to a single line with an ellipsis.
- **Tags** are capped by a new `EntryTags` component: it shows the first few
  public tags and collapses the rest into a muted `+N` badge instead of wrapping
  to a second row. The shared component replaces the inline tag markup the three
  list templates duplicated.
