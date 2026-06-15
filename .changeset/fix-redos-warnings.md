---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

Remove regular-expression denial-of-service (ReDoS) hot spots flagged by code scanning: the tag-only-line check in `normalize` (an exponential `/^(#\S+\s*)+$/`), the slash trim in `normalizeBase` (a quadratic `/^\/+|\/+$/`), and the markdown-link scan in `renderInlineLinks` (a quadratic `/\[([^\]]+)\]\(([^)\s]+)\)/g`, which runs on remote Cosense content). All three are rewritten to linear scans with unchanged behavior.
