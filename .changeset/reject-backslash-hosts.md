---
"@cosense-site-kit/core": patch
"@cosense-site-kit/astro": patch
---

URL 検証の穴を塞いだ。`/\host` 形式の href（ブラウザは `//host` と同じ外部ホストとして解釈する）とバックスラッシュを含むリダイレクト先を拒否し、`.site` のリダイレクト先 `/blog` が `//blog` に化けてビルドが落ちる問題を直した。
