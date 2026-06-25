---
"@cosense-site-kit/core": patch
---

`.site` `site.yaml`: a blank field no longer discards the whole config. An empty value parses to YAML `null`, which Zod's `.default()` ignores — so a single blank `featured:` used to fail validation and drop every *other* setting (home, nav, posts, …) too. Empty values are now normalized before validation: blank list fields fall back to their defaults (`featured:` → `[]`), blank optional sections become absent (`home:`/`posts:`/`theme:`/`favicon:`), a section whose required sub-field is blank (`home:\n  page:`) is treated as absent instead of erroring, and blank entries inside a list are dropped. Valid configs and the existing misspelled/misplaced-key warnings are unaffected.
