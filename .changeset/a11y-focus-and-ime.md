---
"@cosense-site-kit/theme-default": patch
---

fix(theme-default): keyboard/focus a11y for search, lightbox, copy, filters + IME-safe Esc

- **IME-safe Escape**: the header and lightbox keydown handlers now ignore
  Escape fired during IME composition (`isComposing` / `keyCode === 229`), so
  cancelling a Japanese conversion no longer closes the search overlay and
  discards the query.
- **Search overlay**: the box is now `role="dialog" aria-modal="true"`, focus is
  trapped inside while open, and closing returns focus to the search trigger
  instead of dropping it to `<body>`.
- **Lightbox**: content images are now keyboard-operable (focusable,
  `role="button"`, Enter/Space to open — WCAG 2.1.1), the dialog has a visible
  close button that receives focus on open, focus is trapped, and closing
  restores the previously focused element.
- **Code copy button**: reveals on `:focus-visible`, so Tab no longer lands on
  an invisible control.
- **Collection filter chips**: expose `aria-pressed` and keep it in sync, so the
  active filter is announced to screen readers.

Adds a shared `focus-trap` helper used by the search overlay and lightbox.
