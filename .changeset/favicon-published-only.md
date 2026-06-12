---
"@cosense-site-kit/core": patch
---

Restrict the favicon fallback to published pages and make it deterministic: it previously scanned the raw source list, so a draft/private page's image could leak onto the public site as its favicon, and the pick followed the list API's updated-desc order, changing from build to build.
