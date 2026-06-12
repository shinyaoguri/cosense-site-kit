---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

Validate URL schemes in `.site` declarations: `nav[].href` must be http(s)/mailto/tel, a site-relative path, or a fragment (a `javascript:` href passes Astro's attribute escaping untouched), and `redirects` destinations must be slugs or site-relative paths — no open redirects to external sites. `navHref` in theme-utils additionally guards protocol-relative `//host` paths and runs hrefs through `safeHref` as defense in depth.
