# @cosense-site-kit/astro

## 0.2.1

### Patch Changes

- 2aade5f: `CHANGELOG.md` を npm の `files` に含めるようにした。これまで tarball に同梱されておらず、`npm view` やオフラインでは消費側がバージョン間の変更点を追えなかった。
- Updated dependencies [2aade5f]
  - @cosense-site-kit/core@0.4.3

## 0.2.0

### Minor Changes

- 88977a6: Support Astro 7. `peerDependencies` now accept `^5.0.0 || ^6.0.0 || ^7.0.0`, and the in-repo dev/CI toolchain runs on Astro 7.1.x. Astro 5/6 consumers are unaffected — no source changes were needed for the major bump (build, tests, `astro check`, and `tsc --noEmit` all pass unchanged).

## 0.1.6

### Patch Changes

- 2e91f86: fix(astro): dev freshness + symmetric options for the shared pipeline memo

  The process-level `getSharedIntermediate` memo had three problems:

  - **Rejected runs were memoized.** If Cosense was unreachable when the dev
    server started, every later request replayed the same error until the process
    was restarted. The memo now evicts a rejected promise so the next call retries.
  - **No dev freshness.** The memo never expired, so a Cosense edit (or a
    `cosense.config.ts` change) never showed up in `astro dev` without a restart.
    Dev now applies a 30s TTL (re-fetch is differential, so cheap), watches the
    config file to restart on config changes, and invalidates the memo on restart.
    Build keeps a single, never-expiring run.
  - **Asymmetric options double-ran the pipeline.** The integration didn't accept
    `cacheDir`/`force` while the loader did, so a non-default setup keyed the memo
    differently and ran the full fetch/parse/normalize twice. `cacheDir`/`force`
    are now on `CosenseIntegrationOptions` too, and both sides build the memo key
    through one normalizer (undefined-stripped, key-sorted, order-independent for
    config objects).

  Adds the astro package's first tests (key normalization, single-flight,
  reject-eviction, TTL) and documents dev freshness in the README.

- 6fa6808: fix(astro): vendor icons into Astro's configured publicDir

  Icon/favicon vendoring wrote to a hardcoded `process.cwd()/public`, ignoring
  Astro's `publicDir`/`root`. With a custom `publicDir` (or when `astro build` runs
  from a directory other than the project root), the rewritten `src` pointed at a
  directory Astro doesn't serve, 404-ing the images. Both the loader and the
  integration now derive the target from `config.publicDir`.

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
