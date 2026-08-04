# 設計判断の記録（ADR）

このディレクトリには、あとから「なぜこうなっているのか」を再構成できるようにするための
Architecture Decision Record を置く。実装を読めば分かることではなく、**選ばなかった選択肢と、
その判断を覆すべき条件**を残すのが目的。

## 書き方

- ファイル名は `NNNN-短い英語の要約.md`（連番は再利用しない）
- 4 節構成: **状態 / 文脈 / 決定 / 影響**
- 状態は `採用` / `廃止` / `置換（→ NNNN）` のいずれか。決定を覆したときは元の ADR を消さず、
  状態を更新して新しい ADR から参照する
- 1 ADR = 1 判断。実装 PR と同じタイミングで書き、PR から参照する

## 一覧

| # | 状態 | 決定 |
|---|---|---|
| [0001](0001-cosense-api-knowledge-confined-to-core.md) | 採用 | Cosense API の知識を `core` に隔離する |
| [0002](0002-versioned-intermediate-schema.md) | 採用 | バージョン付き中間スキーマをテーマ向けの公開コントラクトにする |
| [0003](0003-npm-workspaces-monorepo.md) | 採用 | npm workspaces のモノレポで配布物とドキュメントサイトを同居させる |
| [0004](0004-changesets-with-npm-trusted-publishing.md) | 採用 | リリースは changesets + npm trusted publishing (OIDC) に任せる |
| [0005](0005-theme-distribution-npm-import-and-vendored.md) | 採用 | テーマは npm import と vendored の 2 モードで配布する |
| [0006](0006-sitesource-abstraction.md) | 採用 | データソースを `SiteSource` インターフェースの背後に置く |

> これらは既に実装済みの判断を、記録が無いまま運用されていたため遡って書き起こしたもの。
> 以降の設計判断は、決定した PR と同じタイミングで追加する。
