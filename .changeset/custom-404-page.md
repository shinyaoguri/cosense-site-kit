---
"@cosense-site-kit/theme-default": minor
"@cosense-site-kit/cli": patch
---

feat(theme-default): add a custom 404 page

The theme now injects a `/404` route, so Astro emits a top-level `dist/404.html`
that GitHub Pages and Cloudflare Workers Static Assets serve for unknown paths
(previously visitors hit the host's generic 404). It's a minimal page — a large
`404`, a short message, and a base-aware link back home — reusing the shared
header (with its search box). The page carries no `data-pagefind-body`, so it
stays out of the search index, and it is not listed in the sitemap.

The Cloudflare deploy generator (`cosense-site deploy init`) now writes
`assets.not_found_handling: "404-page"` into `wrangler.jsonc` so Workers actually
serves the page with a real 404 status. Existing Cloudflare sites should re-run
`cosense-site deploy init --target cloudflare-workers --force` to pick this up;
GitHub Pages needs no config change.
