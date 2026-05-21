# @cosense-site-kit/cli

## 0.1.2

### Patch Changes

- c27c974: `cosense-site deploy init` now generates a CI workflow that runs `npm install` instead of `npm ci` and drops `cache: npm`. Scaffolded sites are created by cloning a template (degit-style, no lockfile committed), but `npm ci` and `setup-node`'s `cache: npm` both require a `package-lock.json` — so the generated workflow failed at the install step. `npm install` works without a lockfile and lets each scheduled rebuild pick up the latest matching framework release.

## 0.1.1

### Patch Changes

- Updated dependencies [a282ee9]
  - @cosense-site-kit/core@0.2.0
