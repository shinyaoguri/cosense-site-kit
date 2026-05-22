# @cosense-site-kit/theme-default

## 0.2.2

### Patch Changes

- bc233b0: Render the site favicon. The Layout now emits `<link rel="icon" href={site.icon}>` from `virtual:cosense-site-kit/site` — the icon of the project's first (or home) page, matching Cosense's favicon behavior.
- Updated dependencies [bc233b0]
  - @cosense-site-kit/core@0.2.1

## 0.2.1

### Patch Changes

- 94cf9f5: Fix the published package missing `src/presets/`. `components/Layout.astro` imports `resolveActiveSkin` from `../presets`, but the `files` allowlist enumerated `src/` subdirectories and omitted `presets/`, so `.astro` (shipped raw) couldn't resolve it and any npm consumer building with the theme failed with `Could not resolve "../presets"`. The in-repo docs site uses workspace deps where `presets/` is present locally, so it never surfaced. Now ships the whole `src/` (matching `theme-utils`) so a new source dir can't be left out of the tarball again.
- Updated dependencies [4e845c6]
  - @cosense-site-kit/theme-utils@0.2.1

## 0.2.0

### Minor Changes

- a282ee9: Let operators switch the theme-default skin from Cosense — no repo or code edit. theme-default now reads `theme.skin` from the `.site` YAML and applies the matching named skin (`light` / `dark`), so changing the look is just an edit in Cosense that the next build picks up. A `theme.skin` in `.site` takes precedence over a `preset` wired in `astro.config.ts` (the developer default). core's `SiteStructure` gains an optional `theme` section (`{ skin?: string }`, kept loose for future fields).
- cf7351a: Add preset (skin) support. `themeDefault({ preset })` recolors the theme via CSS design-token overrides with no new templates — skins are data, not packages, so they don't duplicate rendering. Ships `presetDark`. Token overrides inject as an inline `style` on `<html>` (so they beat the `:root` defaults regardless of stylesheet order), `colorScheme`/`data-theme` are set for native UI, and the font `<link>` is now preset-driven via `fontHref`. The sticky-header background is now the `--color-header-bg` token.

### Patch Changes

- 5fe1058: `create-cosense-site --theme` now accepts any published npm theme package, not just featured ids. A theme declares a `cosenseSiteKit` block in its package.json (`{ kind, schemaVersion, skins }`); create reads it via `npm view` and wires `astro.config.ts` + the dependency — no core-repo edit or central registry needed. Featured ids (e.g. `default`) remain as curated shortcuts. theme-default ships this metadata.
- b367a49: Share the theme integration plumbing in theme-utils so every theme — theme-default and third-party alike — sits on the same base instead of copy-pasting it. Adds `pagePaths()` (the `/[...slug]` getStaticPaths boilerplate) and `optionsVirtualModule(id, options)` (the `virtual:<theme>/options` Vite plugin). theme-default now uses both.
- Updated dependencies [a282ee9]
- Updated dependencies [b367a49]
  - @cosense-site-kit/core@0.2.0
  - @cosense-site-kit/theme-utils@0.2.0
