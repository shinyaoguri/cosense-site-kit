---
"create-cosense-site": minor
---

`create-cosense-site` is now a template-repo fetcher (degit-style). `npm create cosense-site my-site --template <id|user/repo>` shallow-clones a starter template repo (`default` → cosense-site-starter, `lab` → cosense-site-lab, or any `user/repo`) and strips its git history; you then edit `cosense.config.ts` and install. Removed the bundled template, the npm-theme catalog / `--theme <pkg>` metadata machinery, and `--skin` — themes are now distributed as "Use this template" repos (the theme source is vendored in), and skins are chosen in `.site` (`theme.skin`) or astro.config. Requires `git` on PATH.
