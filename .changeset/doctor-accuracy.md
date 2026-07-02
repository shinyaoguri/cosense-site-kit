---
"@cosense-site-kit/core": patch
---

fix(core): doctor accuracy for site-config and redirect checks

Two doctor checks misreported, undermining its "pre-publish gate" role:

- **Site-config false negative**: a broken `.site` YAML (or a page with no
  `code:site.yaml` block) still reported `✓ parsed successfully`, because the
  check only looked at whether the page landed in the excluded list — not the
  parse outcome. The pipeline now emits the parse error on its `site-config`
  progress event, and doctor uses it: a hard parse error fails, a missing
  page/block warns (distinguished in the message), a real parse passes.
- **Redirect false positive**: the schema allows site-relative redirect
  destinations (`/posts`), but the check compared every destination against the
  page-slug set, so a valid `/posts` redirect warned on every run. Site-relative
  (`/`-prefixed) destinations are now skipped.
