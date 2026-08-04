# CLAUDE.md

このリポジトリ固有の文脈だけを書く。使い方は [README](README.md)、開発手順・リリースフローは
[CONTRIBUTING](CONTRIBUTING.md)、テーマ自作は [docs/THEMES.md](docs/THEMES.md) が正本なので、
ここでは繰り返さず**作業前に読むべき場所と、読まないと踏む落とし穴**だけを置く。

## このリポジトリは何か

Cosense（旧 Scrapbox）の公開プロジェクトをデータソースにする SSG フレームワーク。
npm workspaces のモノレポで、`packages/*` を npm 公開し、`site/` は
それ自身を dogfooding した公式ドキュメントサイト。

## 検証コマンド（すべてルートで）

| コマンド | 用途 |
|---|---|
| `npm run build` | tsup で全パッケージをビルド。**`site/` は `dist` を参照するので先に必須** |
| `npm test` | vitest（純粋ユニット + Astro Container API のレンダリング） |
| `npm run typecheck` | 各パッケージの `tsc --noEmit`。theme-* は `astro check` も走る |
| `npm run lint` | `biome check .` |

CI (`ci.yml`) の `check` ジョブがこの 4 つを順に流す。**PR で走る必須チェックは `check` だけ**
（`build.yml` は cron/手動専用、CodeQL は skipping）。

## 踏みやすい落とし穴

- **`.astro` の biome エラーは既知の偽陽性**。マークアップ内のシンボル使用を追えないため未使用
  import/変数が出る。`.ts` のエラーだけ見ればよい。
- **`npm run build` を忘れると `site/` の確認が古い dist で行われる**。テーマを直したのに
  反映されないときはまずこれ。
- **pre-push hook が changeset を強制する**。`packages/*/src/**` か `packages/*/package.json` を
  変更して `.changeset/*.md` を足していないと push が止まる。docs・CI・テストだけの変更なら
  `git push --no-verify` が正しい逃げ道（`.githooks/pre-push`）。
- **pre-1.0 の caret は minor を拾わない**。`^0.2.x` は `0.3.0` を取り込まないので、消費側へ届けたい
  変更は新機能でも patch bump にする（[ADR 0004](docs/decisions/0004-changesets-with-npm-trusted-publishing.md)）。
- **リリースは `npm publish` を手で叩かない**。changeset を書いて main に入れ、自動で開く
  「chore: version packages」PR をマージすると CI が OIDC で公開する。

## 設計上の約束（変更前に必ず）

- **Cosense API の知識は `packages/core/src/source/cosense/` と `packages/core/src/parse/scrapbox.ts`
  だけに置く**。theme / astro / cli から直接 `fetch()` したり scrapbox-parser の型を import しない
  （[ADR 0001](docs/decisions/0001-cosense-api-knowledge-confined-to-core.md)）。
- **`packages/core/src/schema/v1/` は公開コントラクト**。テーマはこの中間モデルしか消費しない
  （[ADR 0002](docs/decisions/0002-versioned-intermediate-schema.md)）。
- ロジックは純粋関数に切り出して `packages/*/test/` に vitest を足す。`.astro` は薄く保つ。

## 作業の記録先

- 設計判断 → [docs/decisions/](docs/decisions/)（ADR。状態 / 文脈 / 決定 / 影響の 4 節）
- 中長期の計画 → [docs/roadmap.md](docs/roadmap.md)
- 進行中の調査・残課題 → GitHub Issue とそのコメント（例: 全体レビューのトラッキング #89）

セッションの記憶はいつでも失われる前提で、経過はここに書き出す。
