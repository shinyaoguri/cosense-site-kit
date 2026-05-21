# create-cosense-site

## 0.2.1

### Patch Changes

- 7d0a6ea: Scaffold new sites against the released 0.2.x framework: the default template now depends on `@cosense-site-kit/core` ^0.2.0 and theme-default ^0.2.0 (astro/cli ^0.1.1). For 0.x, `^0.1.0` excludes 0.2.0, so without this bump `npm create cosense-site` projects would keep installing the old 0.1.0 and miss presets, the `.site theme.skin` switch, and the shared theme-utils helpers.

## 0.2.0

### Minor Changes

- b68984c: Add a theme/skin catalog. `create-cosense-site --theme <id> --skin <id>` (plus an interactive skin picker) scaffolds with the chosen look — e.g. `--skin dark` wires `themeDefault({ preset: presetDark })` into the generated `astro.config.ts`. The catalog in `packages/create/src/catalog.ts` is the single source of truth driving both the picker and the generated config + package.json dependency; adding an official theme/skin is a data edit plus a test, no picker code.
- 5fe1058: `create-cosense-site --theme` now accepts any published npm theme package, not just featured ids. A theme declares a `cosenseSiteKit` block in its package.json (`{ kind, schemaVersion, skins }`); create reads it via `npm view` and wires `astro.config.ts` + the dependency — no core-repo edit or central registry needed. Featured ids (e.g. `default`) remain as curated shortcuts. theme-default ships this metadata.

### Patch Changes

- f9e4de8: theme-lab is no longer a bundled package or a `--theme lab` featured shortcut. Themes are distributed as template repositories that vendor the theme source (framework from npm), so the lab theme now lives in its own template repo (cosense-site-lab). `create --theme default` and `--theme <npm-pkg>` are unaffected.
