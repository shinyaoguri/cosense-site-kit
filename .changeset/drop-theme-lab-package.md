---
"create-cosense-site": patch
---

theme-lab is no longer a bundled package or a `--theme lab` featured shortcut. Themes are distributed as template repositories that vendor the theme source (framework from npm), so the lab theme now lives in its own template repo (cosense-site-lab). `create --theme default` and `--theme <npm-pkg>` are unaffected.
