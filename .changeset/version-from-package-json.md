---
"@cosense-site-kit/core": patch
---

fix(core): resolve VERSION from package.json instead of a hardcoded "0.0.0"

The exported `VERSION` was pinned to `"0.0.0"` while the package shipped 0.4.x,
and the default Cosense `User-Agent` (`cosense-site-kit/0.0.0`) inherited it — so
every client reported 0.0.0 to Cosense, defeating identification for rate-limit
or block analysis. `VERSION` is now read from `package.json` at runtime (same
approach the CLI uses; resolves from src and bundled dist), and the API's default
User-Agent uses it. A regression test asserts `VERSION === package.json.version`
so changesets releases keep it in sync.
