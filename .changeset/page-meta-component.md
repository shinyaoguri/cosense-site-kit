---
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

日付/メタ行の高レベルコンポーネント `<PageMeta>` を theme-utils に追加。ページのタグを受け取って `#no-date` を自分で解釈するので、テーマが `hidesDates()` を呼び忘れても制御タグが効く。判定だけ使いたい場合のために純粋関数 `pageMetaDates()` も export。theme-default の `page.astro` / `EntryCard.astro` を移行 (出力の変化なし)。
