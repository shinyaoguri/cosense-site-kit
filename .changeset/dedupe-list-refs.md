---
"@cosense-site-kit/core": patch
---

fix(core): dedupe source list refs by id so a pagination race can't break slugs

`source.list()` results flowed straight into fetch and slug assignment without
deduping. Cosense's list API paginates over an updated-desc window, so a page
edited mid-fetch can appear in two windows. The duplicate was then fetched twice
and, because `assignSlugs` keys its output by id, collapsed to a single
collision-suffixed slug (`A-2`) — deleting the canonical `/A`, reshuffling the
sitemap/feed to the wrong URL, and failing doctor's "No slug collisions" check
until the next build. `buildIntermediate` now dedupes refs by id (keeping the
newest `updated`) before fetching.
