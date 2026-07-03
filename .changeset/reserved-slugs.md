---
"@cosense-site-kit/core": patch
---

feat(core): `routing.reservedSlugs` to avoid theme-route collisions

A Cosense page titled e.g. "Posts" gets slug `posts`, which collides with a
theme's injected `/posts` route — the page can end up unreachable. `assignSlugs`
now treats any configured `routing.reservedSlugs` like an existing slug: a page
that would take one is given a numeric suffix (`posts-2`) with a warning, so the
theme route keeps the URL and the page stays reachable. Opt-in (default `[]`), so
no behavior change unless set. THEMES.md documents theme-default's reserved
routes (`posts`, `tags`).
