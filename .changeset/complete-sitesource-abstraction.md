---
"@cosense-site-kit/core": patch
---

refactor(core): complete the SiteSource abstraction (normalization moves onto the source)

`source/types.ts` advertised that a new source (esa, Notion, …) could plug in
without touching the pipeline, but the pipeline imported Cosense's `normalizePage`
directly and mapped it over every fetched page — so the abstraction didn't hold
and `SourcePageRaw.text` was implicitly "Scrapbox syntax". `SiteSource` now
carries a `normalize(raw)` method; the Cosense source implements it (delegating
to the Scrapbox parser), and the pipeline calls `source.normalize(...)` instead
of importing source-specific parse code. This makes the abstraction real and
tightens the isolation rule (Cosense knowledge stays inside `source/cosense/` and
`parse/scrapbox`). No behavior change.
