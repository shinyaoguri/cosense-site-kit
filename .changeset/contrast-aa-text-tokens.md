---
"@cosense-site-kit/theme-default": patch
---

fix(theme-default): meet WCAG AA contrast on text tokens

`--color-text-muted` (2.81:1 light / 4.21:1 dark) and `--color-text-faint`
(1.64:1 / 2.07:1) fell below WCAG 2.x AA (4.5:1) yet were used for real content
— list-card dates, page/summary text, the TOC, the 404 code, tag "+N" badges —
so dates and summaries were effectively unreadable for low-vision users and in
bright sunlight.

`--color-text-muted` is darkened to clear 4.5:1 on both the base and card
backgrounds in light (#72716c) and dark (#8f8e8a). `--color-text-faint` is
reclassified as decorative-only (underlines, TOC bars) and its former text uses
are repointed to `--color-text-muted`. Adds a contrast regression test that
parses the light tokens from global.css, merges presetDark, and asserts every
text token clears 4.5:1 against both backgrounds — so future skins are checked
automatically.
