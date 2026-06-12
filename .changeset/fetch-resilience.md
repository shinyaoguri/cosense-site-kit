---
"@cosense-site-kit/core": patch
---

Make unattended builds resilient to per-page fetch failures: a page deleted between list and fetch (404) is now skipped with a warning instead of failing the whole build, and transient failures (network errors, 5xx after retries) fall back to the stale cached copy as the cache layer always documented. Warnings surface in `data.warnings` and `doctor`. `SiteSource.fetch` may now return `null` and accepts an `onWarn` callback.
