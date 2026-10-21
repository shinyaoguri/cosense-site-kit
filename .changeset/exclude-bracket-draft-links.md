---
"@cosense-site-kit/core": patch
---

`[draft]` のようにブラケットリンクで書いた除外タグ（`publish.excludeTags`）も下書きとして扱い、公開しないようにした。Cosense 上では `#draft` と `[draft]` は同じページへのリンクなので、これまでブラケット形式のページは公開されていた。公開側（`#publish`）は従来どおりハッシュタグのみで判定する。
