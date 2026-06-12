---
"@cosense-site-kit/theme-default": patch
---

Fix `[name.icon]` icons breaking the line mid-sentence: the body-image rule's `display: block` was never overridden for icons, so they rendered on their own line instead of inline with the text like on Cosense.
