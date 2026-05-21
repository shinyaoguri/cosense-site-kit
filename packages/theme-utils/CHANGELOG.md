# @cosense-site-kit/theme-utils

## 0.2.0

### Minor Changes

- b367a49: Share the theme integration plumbing in theme-utils so every theme — theme-default and third-party alike — sits on the same base instead of copy-pasting it. Adds `pagePaths()` (the `/[...slug]` getStaticPaths boilerplate) and `optionsVirtualModule(id, options)` (the `virtual:<theme>/options` Vite plugin). theme-default now uses both.

### Patch Changes

- Updated dependencies [a282ee9]
  - @cosense-site-kit/core@0.2.0
