---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

fix(core,theme-utils): harden date conversion against invalid input

Two date conversions could throw `RangeError: Invalid time value` and crash the
whole build:

- **core**: `new Date(raw.created * 1000).toISOString()` in normalize. The wire
  schema's `z.number()` only rejects NaN, so garbage API data (e.g.
  `created: 1e20`) reached `toISOString()` and threw. Epoch→ISO now clamps to the
  valid JS Date range (and treats non-finite as the epoch), so one bad timestamp
  degrades gracefully instead of failing an unattended build.
- **theme-utils**: `formatDate` called `toISOString()` with no NaN guard, unlike
  the sibling `rfc822` in feed.ts. It's a public helper, so a theme passing any
  string would crash the build. It now returns `undefined` for unparseable input
  (templates already guard with `&&`).
