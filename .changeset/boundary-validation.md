---
"@cosense-site-kit/core": patch
---

Validate the Cosense API wire format and cache files at the boundary: unexpected response shapes now fail with an actionable "unexpected response shape" message instead of crashing deep inside parsing (e.g. `RangeError: Invalid time value`), corrupt or truncated cache files register as cache misses (refetch) instead of failing every build until manually deleted, and cache writes are atomic (write-then-rename).
