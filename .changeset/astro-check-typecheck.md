---
"@cosense-site-kit/theme-default": patch
"@cosense-site-kit/theme-utils": patch
---

Type-check `.astro` files with `astro check` (issue #74 Part 3). Both theme packages now run `astro check` before `tsc --noEmit` in `typecheck`, with a typecheck-only `src/content.config.ts` so templates are checked against the real page schema instead of `any`. Fixes surfaced by the new check: `<Code lang>` now receives a `CodeLanguage` (was `string`), and the template dispatcher narrows away the `undefined` from indexed access. No runtime behavior changes.
