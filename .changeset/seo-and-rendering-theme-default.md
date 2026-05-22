---
"@cosense-site-kit/theme-default": patch
---

Add SEO / social output and discovery endpoints:

- New routes: `/sitemap.xml` (all pages + home + tag indexes, with `lastmod`), `/robots.txt` (points at the sitemap), and `/feed.xml` (RSS 2.0 of the posts).
- `Layout` now emits OpenGraph and Twitter Card meta, a canonical link, JSON-LD, and an RSS `<link rel="alternate">` when the site declares a posts tag. Content pages use `og:type=article` and their page image (falling back to the favicon).
- Inline images get a style so they flow within the text line rather than inheriting the block-image margins.
