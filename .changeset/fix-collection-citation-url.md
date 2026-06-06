---
"@cosense-site-kit/theme-utils": patch
---

fix(theme-utils): drop unsafe schemes from collection citation URLs

A citation item's `url` flowed straight into an `<a href>` without the
scheme allow-list that inline markdown links already pass through, so a
`javascript:`/`data:` URL would render as a live link. `parseCollection` now
sanitizes citation URLs at parse time via a shared `safeHref` helper (also
exported), and the template renders plain text when the URL is dropped.
