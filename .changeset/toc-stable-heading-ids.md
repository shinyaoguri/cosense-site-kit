---
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

fix(theme-default,theme-utils): stable heading anchors + English TOC label

The TOC assigned heading ids client-side as a running counter (`heading-3`), so
anchors didn't exist before JS ran and shifted to a different heading whenever one
was added or removed — breaking previously shared `#…` links. Headings now get a
stable, text-derived id server-side (slugified, unicode-friendly, deduped with
`-2` suffixes) in PageContent, and the TOC reads it. The TOC's `aria-label` was
also hardcoded Japanese ("目次") while the rest of the UI is English; it's now
"Table of contents".
