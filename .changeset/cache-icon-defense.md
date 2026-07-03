---
"@cosense-site-kit/core": patch
---

fix(core): harden the local cache against path traversal and truncated icons

Two defense-in-depth gaps in the cache layer — the data CI carries across runs:

- **Page-id path traversal**: the page cache joined the raw id into a file path,
  so a spoofed API id like `../../escaped` could write/read outside cacheDir.
  Ids are now validated (`[A-Za-z0-9_-]+`); an unsafe id is a cache miss on read
  and a no-op on write.
- **Truncated icons reused forever**: icon writes were non-atomic and reuse was
  unconditional, so a build killed mid-write left a 0-byte icon that every later
  build (and CI via actions/cache) reused. Icon writes now use write-then-rename
  (like the page cache), and reuse skips empty files.
