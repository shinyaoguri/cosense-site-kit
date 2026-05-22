---
"@cosense-site-kit/theme-utils": patch
---

Add shared SEO builders and fix list/quote/image rendering:

- New dependency-free builders any theme can use to serve discovery endpoints: `buildSitemap`, `buildRssFeed`, `buildRobotsTxt`, and the `escapeXml` helper they share.
- New `buildListTree` plus a recursive `ListTree.astro` component: consecutive list blocks are folded into one properly nested `<ul>`/`<ol>` (with `<ol>` for ordered lists) instead of a separate single-item `<ul>` per line.
- `PageContent` now groups consecutive quote lines into one `<blockquote>` and renders inline images as `<img>` (via `Inline`), matching core's richer parser output.
