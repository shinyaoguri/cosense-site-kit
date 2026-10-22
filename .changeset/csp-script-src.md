---
"@cosense-site-kit/astro": patch
"@cosense-site-kit/theme-default": patch
---

`dist/_headers` の CSP に `script-src 'self' 'wasm-unsafe-eval'` を加えました。Cosense の本文などから HTML に script が紛れ込んでも、実行されなくなります。

- この制限を保つため、統合は Astro による小さな script のインライン化を止め、script をすべて別ファイルとして出力します。theme-default の LinkPreview も、`is:inline` をやめて通常の script にしました。
- **更新すると止まりうるもの**（Cloudflare Workers で配信しているサイトのみ）:
  - テーマに足した Google Analytics などの外部 script
  - Cloudflare Web Analytics の自動挿入
  - 自作テーマの `is:inline` script やイベントハンドラ属性

  外部 script は `cosense({ csp: { scriptSrc: ["https://static.cloudflareinsights.com"] } })` のように許可元を足せば実行されます。script の制限そのものは `csp: false` で外せます。
