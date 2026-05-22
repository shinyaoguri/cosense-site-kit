---
"@cosense-site-kit/core": patch
---

Richer parsing and a per-page OG image, all additive to the v1 schema:

- Pages now carry an optional `image` (first body image, falling back to the Cosense thumbnail) for use as the OpenGraph/Twitter card image.
- Inline images mixed with text now parse to a real `image` inline node instead of a literal `[image] <url>` text link.
- `>` quote lines now parse to a `quote` block (rendered as `<blockquote>`).
- `N.` numbered lines now parse to an ordered `list` block (`ordered: true`), so themes can emit `<ol>`.
