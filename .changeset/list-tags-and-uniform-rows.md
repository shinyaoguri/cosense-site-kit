---
"@cosense-site-kit/theme-default": minor
---

feat(theme-default): show tags in list views and keep list rows a uniform height

Article list entries (the home "Recent" section, `/posts`, and tag pages) now
display each page's public tags as small chips, reusing the same clickable
`/tags/<tag>` chips as the page header. Control and metadata tags (`#publish`,
`#published/…`, `#template/…`) stay hidden via `isPublicTag`.

List rows are also normalised to a single height: the title and the first-line
summary are each clamped to one line with an ellipsis, and the date sits with
the tags on a single clipped meta row. A long first line or a page with many
tags no longer makes its row taller than its neighbours. The global `.summary`
(site description, profile hero) is intentionally left untruncated.
