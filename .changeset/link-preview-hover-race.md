---
"@cosense-site-kit/theme-default": patch
---

fix(theme-default): don't show a link preview after the pointer has left

The hover preview fetched `link-previews.json` on first use but never re-checked,
after the await, whether the pointer/focus was still on the link. On a slow
connection a brief hover could pop a card seconds later with nothing hovered, and
it lingered until the next scroll/Esc. `show()` now tracks the current link and
bails after the fetch if focus/hover has moved on.
