---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

Table cells now keep their inline markup. The intermediate `table` block's `rows` changed from `string[][]` (each cell a flattened string) to `InlineNode[][][]` (each cell an `InlineNode[]`), so links, decorations, code and icons inside a `table:` cell survive instead of being collapsed to text — and a page link inside a cell now counts in the link graph. `PageContent` renders each cell through `Inline`.

Note: this is a breaking change to the v1 intermediate schema's `table.rows` shape. It is intentional pre-1.0 (no external consumers); a theme that read `table.rows` as strings must read cells as `InlineNode[]`.
