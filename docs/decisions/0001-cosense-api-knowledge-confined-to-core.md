# 0001. Cosense API の知識を core に隔離する

## 状態

採用

## 文脈

データソースである Cosense（旧 Scrapbox）の REST API とページ本文の記法は、**公式に安定を保証された
公開 API ではない**。エンドポイントの形・レスポンスの構造・記法のパース結果は、こちらの都合と無関係に
変わりうる。

素直に作ると、この不安定な形がテーマの `.astro`、Astro インテグレーション、CLI にそのまま漏れる。
そうなると Cosense 側の一度の変更で、フレームワーク全体とサードパーティ製テーマまで同時に壊れ、
修正範囲を事前に見積もれない。

## 決定

Cosense API と記法パーサの知識を、`packages/core` の以下だけに閉じ込める。

- `packages/core/src/source/cosense/` — API 呼び出し・キャッシュ・レスポンスの正規化
- `packages/core/src/parse/scrapbox.ts` — 記法のパース

`theme-*` / `astro` / `cli` からは、直接 `fetch()` を呼ばず、`scrapbox-parser` の型も import しない。
これらは正規化済みの中間モデル（[ADR 0002](0002-versioned-intermediate-schema.md)）だけを消費する。

## 影響

- Cosense 側の変更に対する修正範囲が、上記 2 か所に限定される。
- 別のデータソースを足す余地が残る（[ADR 0006](0006-sitesource-abstraction.md) で実際に抽象化した）。
- 代償として、テーマが「生データを少しだけ覗きたい」ときも中間スキーマに項目を足す必要があり、
  スキーマ変更の手数が増える。これは公開コントラクトを守るための意図的なコスト。
- この約束は文書だけで守られており、機械的な強制はない。違反を防ぐ仕組み（依存グラフ検査や
  lint ルール）は将来の課題として [docs/roadmap.md](../roadmap.md) に置く。
