# site/

公式ドキュメントサイト。cosense-site-kit 自身を使って、Cosense プロジェクト [`cosense-site-kit`](https://scrapbox.io/cosense-site-kit/) をデータソースに静的サイトを生成し、GitHub Pages に公開します。

公開URL（予定）: <https://shinyaoguri.github.io/cosense-site-kit/>

## ローカル開発

```bash
npm install                            # リポジトリのルートで一度だけ
cd site
npx cosense-site doctor                # Cosense プロジェクトの状態を診断
npm run fetch                          # ページ取得 → .cosense-cache/intermediate.json
npm run dev                            # http://localhost:4321/cosense-site-kit/
```

サイトはサブパス `/cosense-site-kit` 配下で配信されるため、ローカルURLも `localhost:4321/cosense-site-kit/` になります。

## デプロイ

`.github/workflows/build.yml`（リポジトリのルートに生成済み）が:

1. cron（1日2回）または手動 dispatch で起動
2. `cosense-site fetch` で Cosense からページを取得（差分のみ）
3. `astro build` で `site/dist/` を生成
4. `actions/upload-pages-artifact` → `actions/deploy-pages@v4` で GitHub Pages へ公開

リポジトリの **Settings → Pages → Source** を **"GitHub Actions"** に切り替えれば、初回 push 以降は cron が自動で更新します。

## Cosense 側の初期設定

[`https://scrapbox.io/cosense-site-kit/`](https://scrapbox.io/cosense-site-kit/) に下記のページを作ります。本文の `#publish` タグが公開のスイッチです（無いページは GitHub Pages に出ません）。

### `.site` ページ（必須・サイト構造の宣言）

タイトル `.site` のページを作り、本文に以下を貼り付けます:

```
.site

このページは cosense-site-kit のサイト構造を宣言する設定ページです。
編集すると次回ビルド時に反映されます。

code:site.yaml
 home:
   page: "Home"

 nav:
   - { label: "Quick start",  page: "Quick start" }
   - { label: "Architecture", page: "Architecture" }
   - { label: "Doctor",       page: "Doctor" }
   - { label: "Deploy",       page: "Deploy" }
   - { label: "GitHub",       href: "https://github.com/shinyaoguri/cosense-site-kit" }

 posts:
   tag: "post"
   limit: 10

 featured:
   - "Quick start"
   - "Architecture"
```

`.site` 自身には `#publish` を付けません（フレームワークが構造ページとして特別扱いし、`/.site` というルートは生成されません）。

### 公開ページ（最低限）

各ページに `#publish` を付けてください:

| タイトル | 内容 | タグ |
|---|---|---|
| `Home` | プロジェクトの3行紹介 + 「できること」 | `#publish` |
| `Quick start` | インストール手順、最初のサイトが立ち上がるまで | `#publish` |
| `Architecture` | 設計ルール、`core` への隔離、中間スキーマ | `#publish` |
| `.site page` | YAML の書き方、各フィールド | `#publish` |
| `Doctor` | `cosense-site doctor` の使い方と読み方 | `#publish` |
| `Deploy` | GitHub Pages / Cloudflare Workers 各々の手順 | `#publish` |

ブログ的に更新ノートを書きたいときは `#post` を追加すると `/posts` フィードに乗ります。

### ドラフト

書きかけは `#draft` を付ければサイトに出ません。`#publish` だけにすると公開、両方付ければ非公開のままです（`excludeTags` が優先）。

## 動作確認

```bash
cd site
npx cosense-site doctor
```

doctor の出力で全部 `✓` になれば公開準備OK。`nav` の参照が `✗` で出ているうちは、その名前のページが Cosense に無いか `#publish` が付いていません。
