---
"@cosense-site-kit/theme-default": patch
---

Theme fixes: the hover TOC panel now uses theme tokens for its background (it was hardcoded white, unreadable on the dark skin) and opens on keyboard focus (`:focus-within`), tag pages sort newest-first like home and /posts, `/posts` is included in sitemap.xml when a posts tag is configured, and the virtual options type shim gained the missing `search` field.
