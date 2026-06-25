# @cosense-site-kit/astro

## 0.1.5

### Patch Changes

- Updated dependencies [25b6dad]
  - @cosense-site-kit/core@0.4.0

## 0.1.4

### Patch Changes

- d70ff1c: Stop clearing the content store on every load: `cosenseLoader` now diffs against the persisted store (set with digest, delete vanished pages), so Astro's Content Layer incremental updates actually take effect instead of every page being marked changed on every build.
- 6d36273: Fix `.site` redirects on subpath deployments (GitHub Pages project sites): the redirect destination now includes `site.base`, so `/repo/old` redirects to `/repo/new` instead of the non-existent `/new`
- Updated dependencies [0982ff4]
- Updated dependencies [a1b77b0]
- Updated dependencies [f976209]
- Updated dependencies [7d7ac4d]
- Updated dependencies [47ab6b2]
- Updated dependencies [bd053d2]
  - @cosense-site-kit/core@0.3.1

## 0.1.3

### Patch Changes

- Updated dependencies [67e3916]
  - @cosense-site-kit/core@0.3.0

## 0.1.2

### Patch Changes

- bc233b0: Expose the favicon to themes. The `cosense()` integration vendors the first/home page's icon (`site.icon` from the intermediate) into `public/cosense-icons/` and adds it to the `virtual:cosense-site-kit/site` module as `icon`, so themes can render `<link rel="icon">`.
- Updated dependencies [bc233b0]
  - @cosense-site-kit/core@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [a282ee9]
  - @cosense-site-kit/core@0.2.0
