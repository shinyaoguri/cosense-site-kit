---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

fix(core,theme-utils): unify URL validation and close a redirect open-redirect

URL safety was validated in three places that had drifted, and the redirect
check was bypassable:

- **Open redirect via `.site` redirects (#63)**: `SAFE_REDIRECT` was a
  leading-anchor denylist, so a leading tab/space (`"\t//evil"`) slipped a
  protocol-relative or scheme value through — browsers strip those before
  parsing, resolving it externally. Redirect destinations are now trimmed and
  checked against an allowlist that rejects control chars, protocol-relative
  `//host`, and any scheme.
- **Divergent SAFE_HREF (#68)**: core allowed `tel:` and rejected `//host`;
  theme-utils' separate copy dropped `tel:` (so a valid `.site` nav `tel:` link
  silently became `#`) and allowed `//host`. Both now use one `safeHref` /
  `isSafeHref` exported from core.
- **Unenforced inline href invariant (#68c)**: `link`/`image` `href` in the
  schema were bare strings relying on a parser guarantee. They now carry the
  `SAFE_HREF` regex, so a future parser/source regression that let `javascript:`
  through is caught at the model boundary instead of reaching `<a href>`.
