---
"@cosense-site-kit/theme-default": patch
---

fix(theme-default): tighten pagefind dev-server path containment

The dev middleware that serves `pagefind/*` checked `file.startsWith(outDir)`,
which also admits a sibling directory like `<outDir>2`, and let a malformed
percent-encoding throw out of `decodeURIComponent`. It now decodes defensively
and requires the resolved path to be the output directory or a separator-bounded
descendant. Dev-server only; production output is unaffected.
