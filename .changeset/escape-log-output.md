---
"@cosense-site-kit/core": patch
"@cosense-site-kit/cli": patch
"@cosense-site-kit/astro": patch
---

Cosense 由来の文字列（ページタイトル、`.site` の YAML エラー、警告）をログに出す前に、改行と制御文字をエスケープするようにしました。複数行の値で CI ログの行頭に `::warning::` などのワークフローコマンドが置かれたり、ANSI エスケープで端末の表示が偽装されたりするのを防ぎます。エスケープには core の `escapeForLog` を使います。

astro 統合に `imageRemotePatterns` オプションを追加しました。`<Image>` がビルド時に取得できるリモート画像のホストを絞れます。既定値はこれまでどおりで、https のホストをすべて許可します。
