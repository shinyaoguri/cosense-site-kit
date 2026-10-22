# @cosense-site-kit/astro

## 0.2.4

### Patch Changes

- a4fdfb4: `dist/_headers` の CSP に `script-src 'self' 'wasm-unsafe-eval'` を加えました。Cosense の本文などから HTML に script が紛れ込んでも、実行されなくなります。
  
  - この制限を保つため、統合は Astro による小さな script のインライン化を止め、script をすべて別ファイルとして出力します。theme-default の LinkPreview も、`is:inline` をやめて通常の script にしました。
  - **更新すると止まりうるもの**（Cloudflare Workers で配信しているサイトのみ）:
    - テーマに足した Google Analytics などの外部 script
    - Cloudflare Web Analytics の自動挿入
    - 自作テーマの `is:inline` script やイベントハンドラ属性
  
    外部 script は `cosense({ csp: { scriptSrc: ["https://static.cloudflareinsights.com"] } })` のように許可元を足せば実行されます。script の制限そのものは `csp: false` で外せます。
- cab0bd6: Cosense 由来の文字列（ページタイトル、`.site` の YAML エラー、警告）をログに出す前に、改行と制御文字をエスケープするようにしました。複数行の値で CI ログの行頭に `::warning::` などのワークフローコマンドが置かれたり、ANSI エスケープで端末の表示が偽装されたりするのを防ぎます。エスケープには core の `escapeForLog` を使います。
  
  astro 統合に `imageRemotePatterns` オプションを追加しました。`<Image>` がビルド時に取得できるリモート画像のホストを絞れます。既定値はこれまでどおりで、https のホストをすべて許可します。
- b89705f: `astro dev` 以外（`astro build` など）で `cosense()` / `cosenseLoader()` に `previewDrafts: true` が明示されていたら、エラーで止めるようにした（#153）。これまでは除外対象のページ（draft）が本番ビルドに載った。しかも `doctor` はこのオプションを見られないため、公開前ゲートを通ってしまっていた。draft のプレビューはこれまでどおり `astro dev` で既定で有効。
- ca5448d: ビルド時に `dist/_headers` を書き出すようにしました。Cloudflare Workers はこのファイルを読み、次のセキュリティヘッダーを全ページに付けます。
  
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN`
  - `Content-Security-Policy`: `frame-ancestors` / `base-uri` / `object-src` / `form-action` の 4 つだけを指定します。
  
  自前の `public/_headers` があればそちらを優先し、既定のファイルは書きません。出力そのものは `securityHeaders: false` で止められます。
- Updated dependencies [3080462]
- Updated dependencies [cab0bd6]
- Updated dependencies [3eb17a9]
  - @cosense-site-kit/core@0.4.7

## 0.2.3

### Patch Changes

- 4abee40: URL 検証の穴を塞いだ。`/\host` 形式の href（ブラウザは `//host` と同じ外部ホストとして解釈する）とバックスラッシュを含むリダイレクト先を拒否し、`.site` のリダイレクト先 `/blog` が `//blog` に化けてビルドが落ちる問題を直した。
- Updated dependencies [b0c910a]
- Updated dependencies [4abee40]
  - @cosense-site-kit/core@0.4.6

## 0.2.2

### Patch Changes

- a23fd82: `.site` の `redirects` のリダイレクト元を検証するようにした。前後の空白と `/` を取り除いたうえで、`.` / `..` / 空のセグメント、`\`、スキーム、制御文字を含むものは設定エラーとして扱う。
- Updated dependencies [2c0abef]
- Updated dependencies [a23fd82]
  - @cosense-site-kit/core@0.4.5

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
