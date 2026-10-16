---
"@cosense-site-kit/theme-utils": patch
---

実行時依存の katex を ^0.19.0 へ更新。0.19 の破壊的変更は `strict` オプションの扱い (欠けた文字メトリクスを strict 経由で報告する・コールバックの戻り値の解釈) に限られ、`renderMath` は `strict: "ignore"` を渡すので出力・公開 API に変更なし。
