---
"@cosense-site-kit/theme-utils": minor
"@cosense-site-kit/theme-default": patch
---

Share the theme integration plumbing in theme-utils so every theme — theme-default and third-party alike — sits on the same base instead of copy-pasting it. Adds `pagePaths()` (the `/[...slug]` getStaticPaths boilerplate) and `optionsVirtualModule(id, options)` (the `virtual:<theme>/options` Vite plugin). theme-default now uses both.
