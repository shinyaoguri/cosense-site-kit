# @cosense-site-kit/theme-utils

## 0.2.1

### Patch Changes

- 4e845c6: Add `formatDate(iso)` (YYYY-MM-DD, UTC) to the public API. theme-default's home/archive/page templates now import it, so theme-utils must be republished alongside theme-default@0.2.1 — otherwise the published theme-default builds against a theme-utils that doesn't export `formatDate`. Versioned as a patch so it stays within the `^0.2.0` range every consumer (and theme-default) already declares.

## 0.2.0

### Minor Changes

- b367a49: Share the theme integration plumbing in theme-utils so every theme — theme-default and third-party alike — sits on the same base instead of copy-pasting it. Adds `pagePaths()` (the `/[...slug]` getStaticPaths boilerplate) and `optionsVirtualModule(id, options)` (the `virtual:<theme>/options` Vite plugin). theme-default now uses both.

### Patch Changes

- Updated dependencies [a282ee9]
  - @cosense-site-kit/core@0.2.0
