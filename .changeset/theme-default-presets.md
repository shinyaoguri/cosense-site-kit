---
"@cosense-site-kit/theme-default": minor
---

Add preset (skin) support. `themeDefault({ preset })` recolors the theme via CSS design-token overrides with no new templates — skins are data, not packages, so they don't duplicate rendering. Ships `presetDark`. Token overrides inject as an inline `style` on `<html>` (so they beat the `:root` defaults regardless of stylesheet order), `colorScheme`/`data-theme` are set for native UI, and the font `<link>` is now preset-driven via `fontHref`. The sticky-header background is now the `--color-header-bg` token.
