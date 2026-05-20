---
"@cosense-site-kit/theme-lab": minor
"create-cosense-site": minor
---

Add `@cosense-site-kit/theme-lab`, a university research-lab theme: `/research` and `/news` index routes, members and publications rendered from `code:members.yaml` / `code:publications.yaml` data blocks, and tag-driven dispatch (`#research`→research-post, `#news`→news-post). Rendering is delegated to `@cosense-site-kit/theme-utils` (`PageContent`/`Inline`) rather than duplicated — the reason the earlier theme-lab was retired.

`create-cosense-site` now registers theme-lab in its catalog and gains an interactive theme picker (the catalog has more than one theme): `create-cosense-site --theme lab` scaffolds with `themeLab()` wired into astro.config.ts.
