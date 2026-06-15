---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

Render `[[name.icon]]` (strongIcon) larger than `[name.icon]`, matching Cosense. The intermediate icon node now carries a `strong` flag, and theme-default sizes strong icons at ~2.5× the normal inline icon. Previously both forms rendered at the same size.
