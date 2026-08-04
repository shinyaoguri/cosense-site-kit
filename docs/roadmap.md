# ロードマップ

中長期の方針の置き場。個々の作業は GitHub Issue が正本なので、ここには**まだ Issue にしていない
方向性**と、**完了して方針から外れたもの**の記録だけを置く。セッションの記憶に頼らず再開できる
状態を保つのが目的。

最終更新: 2026-08-05

## 現在地

pre-1.0。MVP は実プロジェクトに対して end-to-end で動作確認済み。公式ドキュメントサイト自身が
このフレームワークで生成されている（dogfooding）。

直近の全体レビュー（2026-07-02、トラッキング: #89）で挙がった High / Medium / Low はすべて対応済み。

## 完了した重点項目

2026-05 に決めた改善ロードマップは、以下がすべて出荷済み。

- **関連ページ表示（backlinks / 2-hop 相当）** — `theme-utils` の `Backlinks` / `Related` コンポーネント
- **全文検索** — Pagefind ベース（`theme-default`）
- **リンクプレビュー** — hover でのプレビュー（hover/fetch の競合対策込み、#82）
- **テーマの二重配布モード** — npm import と vendored（[ADR 0005](decisions/0005-theme-distribution-npm-import-and-vendored.md)）

## 次に検討する

優先度順ではなく、着手条件つきで並べる。

### 1. vendored テーマの配線取りこぼしを構造的に防ぐ（#126）

`#no-date` の尊重やタグ判定の大文字小文字の扱いを、各テーマが自前で書く設計になっている。
vendored した fork がこの配線を落とす事故が実運用で起きた。日付／メタ行を高レベルコンポーネント
（`PageMeta` 相当）として提供し、テーマが自前で `<time>` を組まなくても済む形にする。

着手条件: [ADR 0005](decisions/0005-theme-distribution-npm-import-and-vendored.md) の vendored モードを
維持する限り必要。テーマ数が増える前に入れたい。

### 2. Dependabot PR が構造的に落ちる 3 パターンの再発防止（#136）

security update が単一 lockfile を更新しない / major bump で config 移行が要る /
`peerDependencies` が更新されない、の 3 パターン。放置すると PR が滞留し、滞留自体が
「CI が赤いのが常態」になって本当の失敗を隠す。

### 3. ページ名変更時のリダイレクト自動生成

現在、Cosense でページ名を変えると slug が変わり、旧 URL は `.site` の `redirects:` に手で書かない限り
404 になる。履歴から旧 slug を推定して自動生成する案があるが、誤検出したリダイレクトは
それ自体が壊れた URL を増やすため、慎重に設計する必要がある。

着手条件: 誤検出時の影響を限定できる設計（doctor での事前提示など）が固まってから。

### 4. 隔離ルールの機械的な強制

[ADR 0001](decisions/0001-cosense-api-knowledge-confined-to-core.md) の「Cosense の知識は `core` の
2 か所だけ」は現在レビューと grep でしか守られていない。依存グラフ検査か lint ルールで CI に載せたい。

## 1.0 に向けて決めること

- 中間スキーマ v1 の凍結タイミングと、v2 マイグレーションの提供形態
  （[ADR 0002](decisions/0002-versioned-intermediate-schema.md)）
- pre-1.0 の「新機能でも patch bump」方針をいつ通常の semver に戻すか
  （[ADR 0004](decisions/0004-changesets-with-npm-trusted-publishing.md)）
- 公式テーマをどこまで monorepo 内に置くか（構造から違うテーマは別パッケージ、という現行方針の限界）
