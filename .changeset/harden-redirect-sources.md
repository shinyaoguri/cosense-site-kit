---
"@cosense-site-kit/core": patch
"@cosense-site-kit/astro": patch
---

`.site` の `redirects` のリダイレクト元を検証するようにした。前後の空白と `/` を取り除いたうえで、`.` / `..` / 空のセグメント、`\`、スキーム、制御文字を含むものは設定エラーとして扱う。
