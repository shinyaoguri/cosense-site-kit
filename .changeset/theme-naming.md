---
"create-cosense-site": minor
---

Rename templates to "themes" for clarity. The CLI flag is now `--theme <id|user/repo>` (with `--template` kept as a deprecated alias, `-t` unchanged), and the interactive picker says "Theme". The featured ids stay `default` / `lab` but now resolve to the renamed theme repositories `cosense-theme-default` / `cosense-theme-lab`. The `@cosense-site-kit/theme-default` npm package is unchanged.
