---
"@cosense-site-kit/cli": patch
"@cosense-site-kit/core": patch
---

fix(cli): validate `deploy init --target` and add a pre-publish doctor gate

Two `deploy init` gaps:

- `--target` was an unchecked free string. A typo like `--target github-page`
  exited 0 and wrote a workflow that matched neither branch (Cloudflare steps,
  but no wrangler.jsonc) — the failure only surfaced at CI time. It now uses
  commander `.choices()` (clear error + exit 1), backed by a runtime guard in
  `runDeployInit` for programmatic/config callers. Targets come from a single
  `DEPLOY_TARGETS` constant now exported from core and reused by the config
  schema.
- The generated workflow ran fetch → build → deploy with no `doctor` step, so
  the documented pre-publish gate never ran on the default path — broken nav
  refs / dead links / draft leaks could publish unnoticed. A
  `cosense-site doctor` step is now inserted between fetch and build by default
  (doctor exits 1 only on fail checks, so warnings don't over-block cron);
  `deploy init --no-doctor` opts out. This repo's own build.yml gained the same
  step, and the README documents the gate and the `--force` re-generate path.
