---
"@cosense-site-kit/theme-utils": patch
---

Add `formatDate(iso)` (YYYY-MM-DD, UTC) to the public API. theme-default's home/archive/page templates now import it, so theme-utils must be republished alongside theme-default@0.2.1 — otherwise the published theme-default builds against a theme-utils that doesn't export `formatDate`. Versioned as a patch so it stays within the `^0.2.0` range every consumer (and theme-default) already declares.
