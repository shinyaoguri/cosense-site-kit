---
"create-cosense-site": minor
"@cosense-site-kit/theme-default": patch
"@cosense-site-kit/theme-lab": patch
---

`create-cosense-site --theme` now accepts any published npm theme package, not just featured ids. A theme declares a `cosenseSiteKit` block in its package.json (`{ kind, schemaVersion, skins }`); create reads it via `npm view` and wires `astro.config.ts` + the dependency — no core-repo edit or central registry needed. Featured ids (e.g. `default`) remain as curated shortcuts. theme-default and theme-lab now ship this metadata.
