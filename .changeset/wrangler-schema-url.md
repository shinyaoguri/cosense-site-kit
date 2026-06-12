---
"@cosense-site-kit/cli": patch
---

`deploy init`: the generated wrangler.jsonc `$schema` URL pointed at a workerd path that now 404s; it now uses wrangler's own published config schema so editor completion works.
