---
"@cosense-site-kit/astro": patch
---

fix(astro): dev freshness + symmetric options for the shared pipeline memo

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
