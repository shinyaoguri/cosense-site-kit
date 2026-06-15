---
"@cosense-site-kit/core": patch
---

Render full inline markup inside table cells. The upstream Scrapbox parser only resolves page links (`[Page]`) inside `table:` cells and leaves labeled external links (`[url label]`), decorations (`[* …]`, `[/ …]`), inline code, formulas, and icons as plain text. Core now re-parses each cell's raw text as a line, so cells get the same inline support as body text — matching how Cosense renders them.
