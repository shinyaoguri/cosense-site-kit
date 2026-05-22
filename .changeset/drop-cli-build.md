---
"@cosense-site-kit/cli": patch
---

Remove the `cosense-site build` command. It was a thin wrapper around `astro build` that nothing used — the generated workflow and the starter scripts call `astro build` directly. Use `astro build` (or `npm run build`) instead. The data-fetch step (`cosense-site fetch`), `doctor`, `validate`, `init`, and `deploy init` are unchanged.
