---
"@cosense-site-kit/theme-utils": patch
---

fix(theme-utils): strip XML-1.0-invalid control chars in escapeXml

`escapeXml` only escaped the five predefined entities, leaving C0 control
characters (U+0000–U+0008, U+000B, U+000C, U+000E–U+001F) intact. A stray control
char in a page title made the hand-rolled `feed.xml`/`sitemap.xml` non-well-formed
so feed readers and crawlers rejected the whole document. Those chars are now
stripped before escaping (TAB/LF/CR are kept).
