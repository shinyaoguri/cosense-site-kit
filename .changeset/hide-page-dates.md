---
"@cosense-site-kit/theme-utils": minor
"@cosense-site-kit/theme-default": minor
---

feat: hide a page's dates with `#no-date`

Adds a `#no-date` control tag. A page carrying it renders without its publish and
update dates — for pages like About where a date isn't meaningful. The dates
still exist in the data (list ordering, RSS `pubDate`, sitemap `lastmod`); only
the display is suppressed, both on the page header and in the home/archive list
cards.

- `@cosense-site-kit/theme-utils` exports `NO_DATE_TAG` and `hidesDates(tags)`,
  and treats `no-date` as a hidden control tag (no chip, not a browsable
  category) — same family as `#publish`/`#draft`.
- `@cosense-site-kit/theme-default`'s `page` template and the list meta rows
  honour it.
