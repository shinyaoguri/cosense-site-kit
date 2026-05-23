# @cosense-site-kit/cli

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
