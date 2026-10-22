---
"@cosense-site-kit/astro": patch
---

`astro dev` 以外（`astro build` など）で `cosense()` / `cosenseLoader()` に `previewDrafts: true` が明示されていたら、エラーで止めるようにした（#153）。これまでは除外対象のページ（draft）が本番ビルドに載った。しかも `doctor` はこのオプションを見られないため、公開前ゲートを通ってしまっていた。draft のプレビューはこれまでどおり `astro dev` で既定で有効。
