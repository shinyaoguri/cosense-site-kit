---
"@cosense-site-kit/core": patch
"@cosense-site-kit/cli": patch
---

fix: reject invalid --concurrency instead of silently fetching zero pages

A non-numeric `--concurrency` parsed to `NaN`, and `Math.max(1, NaN)` is `NaN`,
so the fetch loop never advanced and the build silently produced zero pages.
The CLI now rejects a non-positive-integer `--concurrency` up front, and
`buildIntermediate` / icon vendoring normalize the value defensively so a bad
concurrency can never stall the batch loop.
