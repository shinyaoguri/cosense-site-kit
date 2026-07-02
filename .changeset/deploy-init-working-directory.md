---
"@cosense-site-kit/cli": patch
---

fix(cli): `deploy init --working-directory` generates a workflow that works for npm consumers

`--working-directory <dir>` conflated two independent things: "the site lives in
a subdirectory" and "the framework is built from source" (this repo's own
dogfooding setup). So any consumer whose site lived in a subdir got a workflow
that ran `npm run build` at the repo root and invoked
`node ${{ github.workspace }}/packages/cli/dist/index.js fetch` — paths that
don't exist in a repo that installs the framework from npm, so the workflow
always failed.

`--working-directory` now only scopes the run steps and cache/dist paths to the
subdirectory; the framework is installed from npm and fetch runs via
`npx cosense-site fetch`, and `npm install` runs in that directory (where the
consumer's `package.json` lives) instead of a possibly scriptless repo root. The
source-build behavior moved behind a new internal `--framework-dev` flag (hidden
from `--help`), used only by this repository's own site. README updated.
