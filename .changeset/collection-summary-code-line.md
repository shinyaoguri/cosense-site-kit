---
"@cosense-site-kit/core": patch
---

fix(core): don't surface a YAML code-block line as a page summary

A page whose body is only a data block — e.g. a `#template/collection` CV or
publication page that is a single `code:foo.yaml` block plus tags — has no prose
paragraph, so summary derivation fell through to `descriptions[0]`. Cosense
returns that as the first code line wrapped in backticks (e.g. `` `education:` ``),
which then rendered under the page title. The fallback now scans `descriptions`
for the first real prose line, skipping tag-only and whole-line code-span lines,
so such pages get no junk summary.
