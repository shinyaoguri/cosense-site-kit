---
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

Add a generic, data-driven `collection` page template.

theme-default registers a new `collection` template (opt in with
`#template/collection`, or a `.site` `templates:` mapping). It renders the first
YAML code block on a page as a set of list sections — suitable for a CV,
publication list, works/portfolio index, link list, and so on. Each item renders
from whichever fields it carries (`label`/`period`/`term`/`date`/`year`, `title`,
`authors`/`source`, `description`, `url`); a section automatically grows "All + tag"
filter chips when its items carry `tags` (or any boolean-true field). Section
headings come from the YAML keys, in document order.

theme-utils gains the pure, tested helpers `parseCollection` and
`renderInlineLinks` (and a `yaml` dependency).
