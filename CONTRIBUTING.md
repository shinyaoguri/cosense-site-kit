# コントリビューションガイド

cosense-site-kit **本体（フレームワーク）の開発手順・CI 構成・npm 公開フロー**をまとめます。
フレームワークの使い方は [README](README.md)、テーマ自作の詳細は [docs/THEMES.md](docs/THEMES.md) を参照してください。

## 前提

- **Node.js >= 20**（CI は Node 24）
- **npm**（このリポジトリは npm workspaces 構成です。pnpm / yarn は使いません）

## セットアップ

```bash
git clone https://github.com/shinyaoguri/cosense-site-kit.git
cd cosense-site-kit
npm install      # ルートで一括（全 workspace の依存を解決）
npm run build    # 各パッケージを tsup でビルド（dist 生成）
```

## リポジトリ構成（npm workspaces）

`package.json` の `workspaces: ["packages/*", "site"]`。

| パッケージ | 役割 |
|---|---|
| `packages/core` | fetch・parse・normalize・pipeline・スキーマ・設定ローダー。**Cosense API 依存はここに隔離**する |
| `packages/astro` | Astro 用 Content Loader + `cosense()` インテグレーション |
| `packages/theme-utils` | テーマ共通ヘルパー（`loadStructure` / `parseCollection` / `Inline`・`PageContent` 等） |
| `packages/theme-default` | デフォルトテーマ（テンプレート・スキン・Pagefind 検索） |
| `packages/cli` | `cosense-site`（init / fetch / validate / doctor / deploy） |
| `site` | **公式ドキュメントサイト本体**（dogfooding）。`@cosense-site-kit/*` を `"*"`＝ローカル workspace から解決し、Cosense プロジェクト `cosense-site-kit` を公開元にする |

## 日常の開発コマンド（リポジトリのルートで実行）

| コマンド | 内容 |
|---|---|
| `npm run build` | 全パッケージを tsup でビルド |
| `npm run dev` | 全パッケージを tsup `--watch` |
| `npm test` / `npm run test:watch` | vitest（純粋ユニット ＋ Astro Container API のレンダリングテスト） |
| `npm run typecheck` | 各パッケージで `tsc --noEmit` |
| `npm run lint` | `biome check .` |
| `npm run format` | `biome format --write .` |

> `.astro` ファイルは biome がマークアップ内のシンボル使用を追えないため、未使用 import/変数の偽陽性が出ます（既知のベースライン。`.ts` のエラーだけ気にすればOK）。

## ドキュメントサイト（`site/`）をローカルで確認

`site` は workspace メンバーなので、ローカルの `theme-default` 等の変更が**そのまま反映**されます（npm 公開は不要）。

```bash
npm run build                     # 先にパッケージをビルド（site は dist を参照する）
cd site
npm run fetch                     # Cosense からページ取得 → .cosense-cache/
npm run dev                       # http://localhost:4321/cosense-site-kit/
npm run build && npm run preview  # 本番出力（全文検索もここで動く）
```

## CI 構成（`.github/workflows/`）

### `build.yml` — ドキュメントサイトのデプロイ

- **トリガ**: 手動（`workflow_dispatch`）＋ cron（1日2回）。**push では走りません**。
- **流れ**: `npm ci` → `npm run build`（パッケージ）→ CLI で Cosense fetch → `astro build`（`site/`）→ `site/dist` を GitHub Pages へデプロイ。
- ローカル（workspace）のパッケージでビルドするため、**フレームワークの変更を docs に反映するのに npm 公開は不要**。`main` に入れた変更は、次の cron か手動実行でドキュメントへ反映されます。

### `release.yml` — npm への公開

- **トリガ**: `main` への push。
- [changesets/action](https://github.com/changesets/action) を使用。**npm trusted publishing（OIDC）でトークン不要**（`id-token: write` で OIDC を取得）。
- **動作**:
  - changeset がある状態で push → 「**chore: version packages**」PR を自動で開く/更新（`changeset version`：バージョン上げ＋CHANGELOG 更新＋changeset 消費）。
  - その PR をマージ → changeset が無くなった次の実行で `npm run release`（= `build && changeset publish`）→ npm 公開＋ git タグ。

## リリース / npm 公開フロー（changesets）

公開は **`npm publish` を手で叩きません**。`changeset を書く → main に push → 自動 PR をマージ` の3手で CI が公開します。

1. 変更を実装してコミット（ブランチ運用でも `main` 直でも可）。
2. **changeset を追加**:
   ```bash
   npx changeset
   ```
   対象パッケージ・bump 種別（major/minor/patch）・要約を選ぶと `.changeset/*.md` が生成されます（フォーマットは単純なので、ファイルを直接書いても構いません）。
3. changeset をコミットして `main` に push。
4. CI が「**chore: version packages**」PR を自動作成（バージョン上げ＋CHANGELOG）。
5. **その PR をマージ** → CI が npm へ公開（OIDC）＋ git タグ。
6. 消費側（例: `~/Repos/shinyaoguri.com`）は caret 指定なので、次の `npm install` / CI ビルドで新バージョンを自動取得します。

### changeset の扱い（手動・使い捨て）

changeset は**自動では付きません**。リリースしたい変更ごとに**開発者が手で1つ追加**するものです。CI は changeset を作るのではなく**消費する**側です。

- **ライフサイクル（使い捨て）**: 開発者が `.changeset/*.md` を作る → 次のリリースまで溜まる → 「Version Packages」PR の `changeset version` が**消費して削除**＋バージョン上げ。なので `npx changeset status`（＝今リリースすると何が上がるか）は、未リリースの changeset がある時だけ中身を表示します。複数の changeset は溜まって次のリリースで1回に統合されます。リリース前ならいつでも編集・削除可。
- **付ける**: 公開パッケージ（`core` / `astro` / `theme-utils` / `theme-default` / `cli`）への、利用者に影響する変更（fix / feature / breaking）。変更と**同じ PR/コミット**に入れます。
- **付けない**: ドキュメント（README・CONTRIBUTING・`docs/`）、`site/`（`private: true` なので changesets が無視）、テスト、CI 設定、観測可能な変化のない内部リファクタ。
- **ファイルは直接書いてもOK**（`npx changeset` の対話を使わず）:
  ```markdown
  ---
  "@cosense-site-kit/theme-default": patch
  ---

  ここがそのまま CHANGELOG の1行になる要約。
  ```
- **このリポジトリには「PR に changeset 必須」チェック（changeset-bot 等）はありません**。忘れても `main` にはマージできますが、**誰かが changeset を足すまで公開されません**。リリースしたい変更には忘れず付けてください。形式上どうしても空にしたいときは `npx changeset --empty`。

### bump 種別の指針（pre-1.0）

- 本プロジェクトは **pre-1.0**。消費側は `^0.2.x` のような caret で依存します。
- **`^0.2.x` は `0.3.0` を拾いません**（0.x の caret はマイナーで固定されるため）。新機能であっても、消費側へ自動で届けたいなら **patch** bump が安全です（例: collection テンプレ追加時も theme-utils / theme-default を patch にした）。
- 破壊的変更も pre-1.0 のため in-place で可（[README「スキーマのバージョニング」](README.md) 参照）。`.changeset/config.json` の `updateInternalDependencies: "patch"` により、パッケージ間の依存レンジも自動で更新されます。

### 公開の前提（初回のみ／設定済み）

- 各公開パッケージは npmjs.com 側で **trusted publisher** が設定済みであること（リポジトリ `shinyaoguri/cosense-site-kit` ＋ ワークフロー `release.yml`）。未設定だと publish が認証エラーになります。
- npm provenance のため、各 `package.json` に `repository`（＋ `directory`）を設定済み。

## 設計上の約束（PR を出す前に）

- **Cosense API 知識は `core` に閉じ込める** — theme / astro / cli から直接 `fetch()` したり scrapbox-parser 型を import しない。
- **中間スキーマ（`packages/core/src/schema/v1/`）は公開 API**。変更方針は [README「スキーマのバージョニング」](README.md) を参照。
- ロジックは純粋関数に切り出し `packages/*/test/` に vitest を追加する（`.astro` は薄く保つ）。
