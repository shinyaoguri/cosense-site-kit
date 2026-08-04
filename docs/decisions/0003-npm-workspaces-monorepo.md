# 0003. npm workspaces のモノレポで配布物とドキュメントサイトを同居させる

## 状態

採用

## 文脈

このプロジェクトは 5 つの npm パッケージ（`core` / `astro` / `theme-utils` / `theme-default` / `cli`）に
分かれており、互いに密結合している。加えて公式ドキュメントサイト自身をこのフレームワークで生成する
（dogfooding）ため、「サイトを直すとフレームワークの不足に気づく」という往復が日常的に起きる。

パッケージごとにリポジトリを分けると、この往復のたびに npm 公開を挟むことになり、pre-1.0 の速度が出ない。

## 決定

単一リポジトリの **npm workspaces** で構成する。

- `workspaces: ["packages/*", "site"]`
- `site/` は `@cosense-site-kit/*` を `"*"`（ローカル workspace 解決）で依存し、`private: true`
- パッケージマネージャは **npm に固定**する。pnpm / yarn は使わない
- lockfile はルートに 1 つだけ持つ

## 影響

- ドキュメントサイトの確認にフレームワークの npm 公開が要らない。`npm run build` の後は `site/` から
  ローカルの `dist` がそのまま見える。
- `site/` は `private: true` なので changesets の対象から自動的に外れる。
- 単一 lockfile であることが Dependabot の security update と噛み合わない既知の問題がある
  （マニフェストだけ更新され `npm ci` が sync エラーで落ちる。#136 に記録）。
- ビルド順は `npm run build` のワークスペース列挙順に依存している。`site/` の確認前にビルドを
  忘れると古い `dist` を見ることになる（[CLAUDE.md](../../CLAUDE.md) の落とし穴に記載）。
