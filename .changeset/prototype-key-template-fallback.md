---
"@cosense-site-kit/theme-default": patch
---

fix(theme-default): guard template/skin registry lookups against prototype keys

The per-page template registry and the skin preset registry were plain-object
lookups with a `?? Page` / truthy fallback. Because `??` only catches
undefined/null, an inherited key like `#template/constructor` resolved to
`Object.prototype.constructor` (a function) instead of falling back — Astro then
tried to render a non-component and threw `NoMatchingRenderer`, crashing the
entire `astro build`. A single `#template/constructor` tag in Cosense could halt
every unattended cron build until the tag was removed, breaking the documented
"a bad tag never 500s" guarantee. The skin path had the same hole, silently
applying an empty-token skin instead of warning and falling back.

Both lookups now guard with `Object.hasOwn`, so only own registry keys resolve
and unknown/inherited names fall back as promised. (core's `.site templates:`
mapping is already prototype-safe via its `Object.entries` matcher.)
