---
"@cosense-site-kit/theme-default": minor
---

Richer default theme interactions and content image handling:

- **View Transitions** — native cross-document page transitions (soft cross-fade), a persistent sticky header, a title morph between article pages, and a thumbnail → first-image morph from list cards into the page they open. Chromium-only with graceful fallback; respects `prefers-reduced-motion`.
- **Image lightbox** — clicking a content image opens a full-screen zoom overlay (click or Escape to close). Progressive enhancement; inline icons and linked images are left alone.
- **Content image sizing** — portrait/tall images are height-capped so they no longer dominate the page, while normal images still fill the content width.
- Removed the duplicated tag-chip row from the post header (the page's `#tag`s already render inline in the body).
