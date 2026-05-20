---
"create-cosense-site": minor
---

Add a theme/skin catalog. `create-cosense-site --theme <id> --skin <id>` (plus an interactive skin picker) scaffolds with the chosen look — e.g. `--skin dark` wires `themeDefault({ preset: presetDark })` into the generated `astro.config.ts`. The catalog in `packages/create/src/catalog.ts` is the single source of truth driving both the picker and the generated config + package.json dependency; adding an official theme/skin is a data edit plus a test, no picker code.
