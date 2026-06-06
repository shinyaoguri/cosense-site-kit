---
"@cosense-site-kit/core": patch
---

fix(core): resolve links and vendor icons inside quotes and table cells

Inline traversal only covered paragraph/heading/list, so a `[Page]` link in a
blockquote or table cell was left with no slug (rendered broken even when the
target exists) and a missing target there was invisible to `doctor`; icons in
table cells were likewise never vendored. A shared block-inline walker
(`mapBlockInlines` / `forEachBlockInline`) now drives link resolution, icon
vendoring and the doctor link check uniformly across quote and table blocks.
