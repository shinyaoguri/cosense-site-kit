---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

Two notation-fidelity fixes found via the kitchen-sink page: a linked image on its own line (`[url image-url]`) now keeps its link — the standalone-image path dropped it, so the rendered image wasn't clickable (the intermediate image block gained an optional `href`, and PageContent wraps the `<img>` in an `<a>`; the lightbox already ignores linked images). Helpfeel lines (`? hint`) now render with their `?` marker preserved instead of looking like ordinary inline code.
