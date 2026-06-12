---
"@cosense-site-kit/cli": patch
---

`deploy init`: a fully non-ASCII site title (e.g. Japanese) no longer produces an empty `name` in wrangler.jsonc — it falls back to the Cosense project name. `cosense-site --version` now reports the real package version instead of a hardcoded 0.0.0.
