# @cosense-site-kit/cli

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
