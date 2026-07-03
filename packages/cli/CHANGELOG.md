# @cosense-site-kit/cli

## 0.1.10

### Patch Changes

- eb79e8e: fix(cli): validate deploy-init inputs and pin action versions in one place

  Four hardening fixes to `deploy init` generation:

  - Worker names no longer keep a trailing hyphen left by the 63-char cut (wrangler
    rejects it); leading/trailing hyphens are trimmed after truncation.
  - `--schedule` is validated as a 5-field cron; a malformed value now fails
    generation instead of producing a workflow that silently never fires.
  - `--working-directory` is validated as a plain relative path, so a value with
    spaces/quotes/colons can't emit invalid YAML.
  - GitHub Action versions live in one `ACTION_VERSIONS` table (bumped to match
    this repo's own build.yml), with a test asserting they stay in sync with the
    dogfood workflow — so a dependabot bump there can't silently leave the
    generated-for-users workflow behind.

- e9ac3c9: fix(cli): validate `deploy init --target` and add a pre-publish doctor gate

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

- 7526a16: fix(cli): `deploy init --working-directory` generates a workflow that works for npm consumers

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

- 451ad20: fix(cli): scope generated Pages workflow permissions to jobs

  The generated GitHub Pages workflow declared `pages: write` / `id-token: write`
  at the workflow level, granting them to the build job too. Permissions are now
  job-scoped: the build job is `contents: read` only, and `pages: write` +
  `id-token: write` are granted to the deploy job alone (least privilege). This
  repo's own build.yml and release.yml got the same treatment (plus release.yml
  now pins npm to an exact version and SHA-pins changesets/action).

- Updated dependencies [3e1f929]
- Updated dependencies [14972c8]
- Updated dependencies [3b3a561]
- Updated dependencies [2de33fe]
- Updated dependencies [ed190c2]
- Updated dependencies [e9ac3c9]
- Updated dependencies [0c67e12]
- Updated dependencies [e0b1b5a]
- Updated dependencies [53a1ae2]
- Updated dependencies [e7c30d0]
- Updated dependencies [280561b]
  - @cosense-site-kit/core@0.4.2

## 0.1.9

### Patch Changes

- Updated dependencies [25b6dad]
  - @cosense-site-kit/core@0.4.0

## 0.1.8

### Patch Changes

- 354a008: `init` / `deploy init`: auto-detect the GitHub Pages base path so a site's CSS loads at any URL. The generated config reads `site.base` / `site.baseUrl` from `PAGES_BASE_PATH` / `PAGES_ORIGIN`, and the generated Pages workflow injects those from `actions/configure-pages` (user pages at `/`, project pages at `/REPO`). Previously a fork served at a different path than the hardcoded `base` 404'd its bundled assets and rendered unstyled. Cloudflare is unaffected (no env set → base `/`).

## 0.1.7

### Patch Changes

- 22f16c8: `deploy init`: fix the generated `actions/cache` key — a fixed key is never re-saved after the first exact hit, freezing the Cosense cache at its first-run contents and defeating the differential fetch. The key is now unique per run (`github.run_id`) with a `restore-keys` prefix fallback. Also adds a `concurrency` group to the Cloudflare workflow so cron and manual dispatch never race. Existing sites: re-run `cosense-site deploy init --force` to pick this up.
- 6cd9387: `deploy init`: a fully non-ASCII site title (e.g. Japanese) no longer produces an empty `name` in wrangler.jsonc — it falls back to the Cosense project name. `cosense-site --version` now reports the real package version instead of a hardcoded 0.0.0.
- c497c5e: `deploy init`: the generated wrangler.jsonc `$schema` URL pointed at a workerd path that now 404s; it now uses wrangler's own published config schema so editor completion works.
- Updated dependencies [0982ff4]
- Updated dependencies [a1b77b0]
- Updated dependencies [f976209]
- Updated dependencies [7d7ac4d]
- Updated dependencies [47ab6b2]
- Updated dependencies [bd053d2]
  - @cosense-site-kit/core@0.3.1

## 0.1.6

### Patch Changes

- Updated dependencies [67e3916]
  - @cosense-site-kit/core@0.3.0

## 0.1.5

### Patch Changes

- a99e532: feat(theme-default): add a custom 404 page

  The theme now injects a `/404` route, so Astro emits a top-level `dist/404.html`
  that GitHub Pages and Cloudflare Workers Static Assets serve for unknown paths
  (previously visitors hit the host's generic 404). It's a minimal page — a large
  `404`, a short message, and a base-aware link back home — reusing the shared
  header (with its search box). The page carries no `data-pagefind-body`, so it
  stays out of the search index, and it is not listed in the sitemap.

  The Cloudflare deploy generator (`cosense-site deploy init`) now writes
  `assets.not_found_handling: "404-page"` into `wrangler.jsonc` so Workers actually
  serves the page with a real 404 status. Existing Cloudflare sites should re-run
  `cosense-site deploy init --target cloudflare-workers --force` to pick this up;
  GitHub Pages needs no config change.

## 0.1.4

### Patch Changes

- 3522a79: fix(cli): install at the workspace root in the generated Cloudflare workflow

  In a monorepo the Cloudflare Workers workflow set the job's working-directory to
  the site subdirectory but ran `npm install` there with no override, unlike the
  Pages workflow which pins the install to `github.workspace`. The generated
  Cloudflare workflow now pins `npm install` to the workspace root too, so the
  whole npm workspace is installed regardless of subdirectory lockfile state.

- 3522a79: fix: reject invalid --concurrency instead of silently fetching zero pages

  A non-numeric `--concurrency` parsed to `NaN`, and `Math.max(1, NaN)` is `NaN`,
  so the fetch loop never advanced and the build silently produced zero pages.
  The CLI now rejects a non-positive-integer `--concurrency` up front, and
  `buildIntermediate` / icon vendoring normalize the value defensively so a bad
  concurrency can never stall the batch loop.

- Updated dependencies [3522a79]
- Updated dependencies [3522a79]
  - @cosense-site-kit/core@0.2.4

## 0.1.3

### Patch Changes

- d946c43: Remove the `cosense-site build` command. It was a thin wrapper around `astro build` that nothing used — the generated workflow and the starter scripts call `astro build` directly. Use `astro build` (or `npm run build`) instead. The data-fetch step (`cosense-site fetch`), `doctor`, `validate`, `init`, and `deploy init` are unchanged.
- Updated dependencies [9c703fb]
- Updated dependencies [3a255f8]
- Updated dependencies [3669423]
  - @cosense-site-kit/core@0.2.2

## 0.1.2

### Patch Changes

- c27c974: `cosense-site deploy init` now generates a CI workflow that runs `npm install` instead of `npm ci` and drops `cache: npm`. Scaffolded sites are created by cloning a template (degit-style, no lockfile committed), but `npm ci` and `setup-node`'s `cache: npm` both require a `package-lock.json` — so the generated workflow failed at the install step. `npm install` works without a lockfile and lets each scheduled rebuild pick up the latest matching framework release.

## 0.1.1

### Patch Changes

- Updated dependencies [a282ee9]
  - @cosense-site-kit/core@0.2.0
