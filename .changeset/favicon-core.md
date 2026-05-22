---
"@cosense-site-kit/core": patch
---

Resolve a site favicon from the project's first page, mirroring Cosense (where the top page's icon becomes the project favicon). The pipeline picks the configured home page's image, else the first source-listed page that has one, and exposes it as `site.icon` on the intermediate model. Also adds `vendorImage()` — downloads a single image to a local copy (the Astro integration uses it to vendor the favicon, sidestepping scrapbox.io's cross-origin block). Patch to stay within the `^0.2.0` range consumers declare.
