# cosense-site-kit

[Cosense](https://scrapbox.io)（旧 Scrapbox）の公開プロジェクトをデータソースにして静的サイトを生成する、小さな SSG フレームワーク。個人ページ・研究室サイト・プロジェクトサイト・授業サイトなどに横展開できます。

Cosense で執筆 → Cloudflare Workers Static Assets または GitHub Pages に公開、ビルドは GitHub Actions の cron が定期実行。

> ステータス: pre-1.0。MVP は実プロジェクトに対して end-to-end で動作確認済み。

## できること

- **Cosense を CMS として使う**。`#publish` を付けたページだけがサイトのルートになります。
- **Cosense 内の `.site` ページで構造を宣言**。ナビゲーション、ホームページ、ブログフィード、注目ページ、リダイレクトを YAML で書けば、コードを触らずに反映されます。
- **安定した中間データモデル**。Cosense API は将来変更される可能性のある「内部 API」とみなし `core` に閉じ込めています。テーマはバージョン付きで zod 検証された中間スキーマだけを消費します。
- **`doctor` コマンド**。ナビの参照切れ・内部リンク切れ・draft タグの漏れ・公開ページ 0 件などを公開前に検出します。
- **ゼロから動くサイトまで 1 コマンド**。`npm create cosense-site my-site` でそのまま立ち上がるスターターが生成されます。

## クイックスタート

```bash
npm create cosense-site my-site --title "My Site" --url "https://example.com" --project "your-public-cosense-project" --yes
cd my-site
npm install
npm run fetch         # Cosense からページを取得 → .cosense-cache/
npm run dev           # http://localhost:4321
```

フラグを省略するとインタラクティブにプロンプトが出ます。

## ページの公開制御

デフォルトでは何も公開されません。1ページずつ opt-in する設計です。

| タグ | 効果 |
|---|---|
| `#publish` | ページがビルド対象に含まれる（`publish.includeTags`） |
| `#draft` / `#private` / `#internal` | `#publish` があっても除外（`publish.excludeTags`） |
| `#slug/research` | URL スラッグを明示指定。無指定の場合はタイトルから生成 |
| `#post`（変更可） | `/posts` フィードとホームの「Recent posts」に表示。タグ名は `.site` の YAML で指定 |

「`#draft` 以外は全部公開」にしたい場合は `cosense.config.ts` で `publish.default: "all"` にします。

## `.site` ページ

Cosense にタイトル `.site` のページを作ります（Cosense は `_` を空白として扱うため、先頭は `.` が安全）。中に `code:site.yaml` を 1 つ置けば、そこがサイト構造の宣言点になります。それ以外の場所には自由にメモを書けます。

```
.site

このページはサイト構造の宣言用です。下の YAML を編集すると、次回のビルドに反映されます。

code:site.yaml
 home:
   page: "ABOUT ME"

 nav:
   - { label: "About",    page: "ABOUT ME" }
   - { label: "Research", page: "Research" }
   - { label: "GitHub",   href: "https://github.com/you" }

 posts:
   tag: "post"
   limit: 10

 featured:
   - "代表的な作品"
   - "おすすめページ"

 redirects:
   legacy-about: about
   old-slug:    new-slug
```

YAML スキーマ:

| フィールド | 型 | 説明 |
|---|---|---|
| `home.page` | Cosense ページタイトル | ホーム本文として描画。未指定なら "Recent pages" 一覧にフォールバック |
| `nav[]` | `{label, page}` または `{label, href}` | ヘッダーの項目。`page` は Cosense タイトル、`href` は任意の URL |
| `posts.tag` | string | このタグが付いたページが `/posts` とホームに表示される |
| `posts.limit` | number | ホームの「Recent posts」の表示件数上限 |
| `featured[]` | Cosense ページタイトル | ホームの注目ページブロック |
| `redirects` | `{oldSlug: newSlug}` | Astro の redirects 機構に流し込まれる |

未知のトップレベルキーは zod の `passthrough` で保持されるので、テーマやプラグインが独自セクション（例: `profile:`, `members:`）を YAML に足しても core の改修なしで読み取れます。

### `.site` が存在しないとき

何も壊れません。`/` には最近のページ一覧が出て、ナビなし・posts なしで動きます。`.site` ページは完全な **opt-in** です。

## アーキテクチャ

```
Cosense public project
   │
   │  list + 差分 fetch（cache: .cosense-cache/）
   ▼
@cosense-site-kit/core
   • fetch / parse / normalize / validate
   • publish フィルタ（include/exclude tags）
   • slug + 内部リンク解決 + backlinks
   • .site の site.yaml を SiteStructure にパース
   │
   ▼
バージョン付き中間 JSON  ← 安定した公開コントラクト（schemaVersion: "1"）
   │
   ▼
@cosense-site-kit/astro      （Astro Content Loader + Integration）
   │
   ▼
@cosense-site-kit/theme-*    （ルートを inject する Astro Integration）
   │
   ▼
静的サイト → CDN（Cloudflare Workers Static Assets / GitHub Pages）
   │
GitHub Actions cron（デフォルトで 1 日 2 回）が全体を再ビルド。
```

設計の核となるルール: **Cosense API の知識は `core/src/source/cosense/` と `core/src/parse/scrapbox.ts` だけに置く**。テーマ・Astro・CLI は中間モデルしか触りません。Cosense API が変わったとき、修正範囲はその 2 ファイルだけで済みます。

## パッケージ構成

| パッケージ | 役割 |
|---|---|
| `@cosense-site-kit/core` | fetch、cache、parse、normalize、schema、pipeline、doctor、config loader |
| `@cosense-site-kit/astro` | `cosense()` Integration、`cosenseLoader` / `cosenseSiteLoader` Content Loader |
| `@cosense-site-kit/theme-default` | デフォルトテーマ（Layout、ページ、タグ、posts、ホーム） |
| `@cosense-site-kit/cli` | `cosense-site` バイナリ |
| `create-cosense-site` | スカフォルダ（`npm create cosense-site …`） |
| `@cosense-site-kit/deploy` | 純関数ジェネレータ: GitHub Actions ワークフロー、Cloudflare `wrangler.jsonc` |

## CLI

```
cosense-site init                 cosense.config.ts のスターターを生成
cosense-site fetch  [--force]     ページ取得 → .cosense-cache/intermediate.json
cosense-site build                Astro ビルドを実行
cosense-site validate             fetch せずに cosense.config を検証・要約
cosense-site doctor [--force]     診断: publish 結果・リンク切れ・構造参照
cosense-site deploy init          .github/workflows/build.yml と wrangler.jsonc を生成
                                  （target / schedule は cosense.config.deploy から）
```

長期運用の観点で最も効くのが `doctor` です。実行例:

```
Doctor report for "my-project"

  ✓ Pipeline warnings  none
  ✓ Publish rules produce pages  23 kept, 132 excluded
  ✓ Site-config page  ".site" parsed successfully
  ✗ Nav references resolve  1 nav reference(s) point to missing pages
      · "Contact" is not a published page
  ⚠ Internal page links resolve  4 broken page link target(s)
      · "Old Topic" referenced by 2 page(s) ("Notes", "Roadmap")
  ✓ No slug collisions  all slugs unique
  ✓ No draft leak  no excluded-tag pages published

Summary: 6 ok, 1 warn, 1 fail
```

`fail` が 1 件でもあれば exit code 1 を返すので、CI に組み込んで公開前ゲートとして使えます。

## `cosense.config.ts`

```ts
import { defineCosenseSite } from "@cosense-site-kit/core";

export default defineCosenseSite({
  site: {
    title: "My Site",
    description: "...",
    baseUrl: "https://example.com",
    lang: "ja",
  },

  source: {
    type: "cosense",
    project: "your-public-project",
  },

  publish: {
    default: "none",                                  // または "all"
    includeTags: ["publish"],
    excludeTags: ["draft", "private", "internal"],
  },

  routing: {
    slug: "metadata-or-encoded-title",                // または "title" / "encoded-title"
  },

  siteConfig: {
    page: ".site",                                    // null にすると機能を無効化
  },

  deploy: {
    target: "cloudflare-workers",                     // または "github-pages"
    schedule: "17 1,13 * * *",                        // 1日2回、毎時00分を避ける
  },
});
```

## デプロイ

`cosense-site deploy init` で次のファイルが生成されます:

- `.github/workflows/build.yml` — checkout → Cosense cache 復元 → `cosense-site fetch` → `astro build` → `cloudflare/wrangler-action@v3` で Workers へ、または GitHub Pages へ公開
- `wrangler.jsonc`（Cloudflare 用のみ） — Workers Static Assets を `./dist` に向けた設定

ビルドは cron + `workflow_dispatch` の併用が前提です。Cosense は分単位で更新するものではないので、1 日 2 回で十分です。

Cloudflare を使う場合に必要なシークレット: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。

## fetch キャッシュの仕組み

`.cosense-cache/pages/<shard>/<pageId>.json` に各ページの最新本文を保持します。`cosense-site fetch` は毎回 Cosense の一覧 API を呼んで `updated` タイムスタンプを比較し、変更されたページだけ本文を再取得します。キャッシュは `actions/cache@v4` で CI 実行間にまたがって永続化され、ビルド中にネットワーク障害が起きても直前の cache でビルドを継続できます。

`cosense-site fetch --force` でキャッシュを無視して全件再取得できます。

## スキーマのバージョニング

中間モデルは `schemaVersion: "1"` を持っています。スキーマ実体は `packages/core/src/schema/v1/` にあり、`@cosense-site-kit/core/schema` から re-export されています。v2 が必要になったとき、v1 はその場に残し、別ディレクトリで v2 とマイグレーションヘルパを並べる方針です。テーマは特定スキーマバージョンに pin して自分のペースで追従できます。

## ライセンス

MIT
