---
"@cosense-site-kit/theme-utils": patch
---

`PageContent` highlights code blocks at build time with Astro's bundled Shiki (dual light/dark theme) instead of emitting a plain `<pre><code>`. Unknown languages fall back to `plaintext` so the build never fails on an exotic extension, and the inferred language is kept on the `<pre>` as `data-language`. Every theme now gets syntax-highlighted code; per-skin colors and line numbers stay the theme's CSS to style.
