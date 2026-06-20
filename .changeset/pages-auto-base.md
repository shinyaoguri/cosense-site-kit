---
"@cosense-site-kit/cli": patch
---

`init` / `deploy init`: auto-detect the GitHub Pages base path so a site's CSS loads at any URL. The generated config reads `site.base` / `site.baseUrl` from `PAGES_BASE_PATH` / `PAGES_ORIGIN`, and the generated Pages workflow injects those from `actions/configure-pages` (user pages at `/`, project pages at `/REPO`). Previously a fork served at a different path than the hardcoded `base` 404'd its bundled assets and rendered unstyled. Cloudflare is unaffected (no env set → base `/`).
