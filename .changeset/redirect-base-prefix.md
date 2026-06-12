---
"@cosense-site-kit/astro": patch
---

Fix `.site` redirects on subpath deployments (GitHub Pages project sites): the redirect destination now includes `site.base`, so `/repo/old` redirects to `/repo/new` instead of the non-existent `/new`
