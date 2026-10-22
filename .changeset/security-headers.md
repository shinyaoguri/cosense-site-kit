---
"@cosense-site-kit/astro": patch
---

ビルド時に `dist/_headers` を書き出すようにしました。Cloudflare Workers はこのファイルを読み、次のセキュリティヘッダーを全ページに付けます。

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy`: `frame-ancestors` / `base-uri` / `object-src` / `form-action` の 4 つだけを指定します。

自前の `public/_headers` があればそちらを優先し、既定のファイルは書きません。出力そのものは `securityHeaders: false` で止められます。
