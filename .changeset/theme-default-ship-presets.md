---
"@cosense-site-kit/theme-default": patch
---

Fix the published package missing `src/presets/`. `components/Layout.astro` imports `resolveActiveSkin` from `../presets`, but the `files` allowlist enumerated `src/` subdirectories and omitted `presets/`, so `.astro` (shipped raw) couldn't resolve it and any npm consumer building with the theme failed with `Could not resolve "../presets"`. The in-repo docs site uses workspace deps where `presets/` is present locally, so it never surfaced. Now ships the whole `src/` (matching `theme-utils`) so a new source dir can't be left out of the tarball again.
