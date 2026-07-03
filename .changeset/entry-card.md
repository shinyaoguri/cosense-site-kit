---
"@cosense-site-kit/theme-default": patch
---

refactor(theme-default): extract a shared EntryCard, fixing the missing date on tag pages

The page-list card markup was copy-pasted across the home, /posts and /tags/<tag>
templates and had already drifted: the tag list had silently lost its date row,
so the same page looked different on /posts and /tags/<tag>. The card is now a
single `EntryCard.astro` used by all three (with a `showDate` prop for explicit
opt-out), so they can't drift again and tag pages show dates like the others.
