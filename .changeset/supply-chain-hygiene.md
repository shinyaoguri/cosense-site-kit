---
"@cosense-site-kit/cli": patch
---

fix(cli): scope generated Pages workflow permissions to jobs

The generated GitHub Pages workflow declared `pages: write` / `id-token: write`
at the workflow level, granting them to the build job too. Permissions are now
job-scoped: the build job is `contents: read` only, and `pages: write` +
`id-token: write` are granted to the deploy job alone (least privilege). This
repo's own build.yml and release.yml got the same treatment (plus release.yml
now pins npm to an exact version and SHA-pins changesets/action).
