---
"@cosense-site-kit/core": patch
---

Make slug collision suffixes deterministic: when two titles map to the same slug (e.g. "Foo Bar" and "Foo_Bar"), the `-2` suffix is now assigned by creation date instead of the list API's updated-desc order, which silently swapped the two pages' public URLs whenever either was edited. Collisions are also reported as pipeline warnings so `doctor` surfaces them.
