---
"create-cosense-site": patch
---

Scaffold new sites against the released 0.2.x framework: the default template now depends on `@cosense-site-kit/core` ^0.2.0 and theme-default ^0.2.0 (astro/cli ^0.1.1). For 0.x, `^0.1.0` excludes 0.2.0, so without this bump `npm create cosense-site` projects would keep installing the old 0.1.0 and miss presets, the `.site theme.skin` switch, and the shared theme-utils helpers.
