---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

fix: match tags and titles case-insensitively, like Cosense does

Cosense collapses case-variant tags, links, and titles onto one entity, so
authors have no way to tell `#Draft` from `#draft`. Several matchers compared
raw strings, which broke that expectation — most seriously the publish filter,
where a page tagged `#publish #Draft` slipped past `excludeTags: ["draft"]` and
was published (the safety rule "exclude always wins" failed *open*).

All author-supplied tag/title matching now normalizes through a single
`normalizeKey` helper (shared with internal-link resolution): the publish
filter, `#published/`/`#updated/`/`#slug/`/`#template/` tag prefixes, the
`.site` `templates:` and `favicon:` title lookups, the `.site` config page
detection, the doctor draft-leak and posts-tag checks, theme tag classification
(`isHiddenTag`/`isPublicTag`/`hidesDates`), 2-hop related-page scoring, and the
`/posts` feed membership across home/archive/RSS. Display strings keep their
original case; only matching is normalized.
