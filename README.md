# cosense-site-kit

[Cosense](https://scrapbox.io)（旧 Scrapbox）の公開プロジェクトをデータソースにして静的サイトを生成する、小さな SSG フレームワーク。個人ページ・研究室サイト・プロジェクトサイト・授業サイトなどに横展開できます。

Cosense で執筆 → Cloudflare Workers Static Assets または GitHub Pages に公開、ビルドは GitHub Actions の cron が定期実行。

> 本プロジェクトは非公式のコミュニティ製ツールであり、Cosense およびその運営会社とは提携・関係はありません。「Cosense」は各権利者の商標です。

> ステータス: pre-1.0。MVP は実プロジェクトに対して end-to-end で動作確認済み。
>
> **ライブ例**: 公式ドキュメントサイト自身が cosense-site-kit で生成されています — <https://shinyaoguri.github.io/cosense-site-kit/> （データソース: <https://scrapbox.io/cosense-site-kit/>、設定: [site/](site/)）

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
| `#template/profile` | このページを `profile` テンプレートで描画。詳細は[テンプレート](#テンプレート) |

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

## テンプレート

WordPress のテンプレート階層と同じ発想で、**ページごとに違う見た目**を出せます。URL は `/<slug>` のまま、中身のレンダリングだけテーマが切り替えます。

### 仕組み

1. 各 Cosense ページには **`template: string`** が解決されます（中間モデルの一部）
2. テーマは `_dispatcher.astro` の中に `template名 → .astro コンポーネント` のレジストリを持ちます
3. `/[...slug]` のディスパッチャがその map を引いて、適切なテンプレートに `entry` を渡します

### テンプレートの指定方法（優先度順）

| 優先度 | 仕組み | 例 |
|---|---|---|
| 1 | ページ本文の `#template/<name>` タグ | `#template/profile` をページに付ける |
| 2 | `.site` YAML の `templates:` マッピング | `templates: { "About Me": profile }` |
| 3 | デフォルト | `page` |

タグが付いている場合はそれが勝ち、無ければ YAML のマッピング、それも無ければ `page` テンプレート。

### theme-default が提供するテンプレート

| 名前 | 用途 |
|---|---|
| `page` | 通常ページ（デフォルト）。タイトル + タグチップ + 本文 + backlinks |
| `profile` | プロフィール系。中央寄せヒーロー + 本文。タグチップなし |

### ページごとの切り替え例

Cosense の `About Me` ページ本文に:
```
About Me

私についての説明...

#publish #template/profile
```

または、`.site` の YAML で一括:
```yaml
templates:
  "About Me": profile
  "Members":  members
  "Welcome":  landing
```

### カスタムテンプレートの作り方

既存テーマに 1 テンプレ追加するだけなら、`.astro` ファイルを 1 つ書いて `_dispatcher.astro` の `TEMPLATES` レジストリに登録するだけです:

```astro
---
// my-theme/src/templates/landing.astro
import type { CollectionEntry } from "astro:content";
import Layout from "../components/Layout.astro";
interface Props { entry: CollectionEntry<"pages"> }
const { entry } = Astro.props;
---
<Layout title={entry.data.title}>
  <!-- 自由なマークアップ -->
</Layout>
```

```astro
---
// my-theme/src/templates/_dispatcher.astro に追加
import Landing from "./landing.astro";
const TEMPLATES = { page: Page, profile: Profile, landing: Landing };
---
```

未知のテンプレート名は `page` にフォールバックするので、Cosense 側のタイポでサイトが 500 を返すことはありません。

### テーマを自作する

新しいテーマを 0 から作る場合は **[docs/THEMES.md](./docs/THEMES.md)** に完全ガイドがあります。`Integration として何を返すか` / `injectRoute の使い方` / `virtual module で options を渡す方法` / `pages collection と SiteStructure の読み方` / `tsup の設定` まで網羅。

データレイヤだけ簡単に説明すると、テーマは次の 3 つだけを消費します:

| インタフェース | 用途 | API |
|---|---|---|
| `pages` collection | 公開済みページ一覧 | `getCollection("pages")` |
| `virtual:cosense-site-kit/site` | `cosense.config.ts` の `site` ブロック | `import site from "..."` |
| `virtual:cosense-site-kit/structure` | `.site` ページの構造体 (推奨は `loadStructure()` 経由) | `@cosense-site-kit/theme-utils` |

頻出処理は `@cosense-site-kit/theme-utils` にあるので積極的に使ってください (`loadStructure`, `loadTitleToSlug`, `navHref`, `path`, `isPublicTag`, `isHiddenTag`, 共通 `Backlinks.astro`)。

### 公式テーマ

| パッケージ | キャラクター | 主な用途 |
|---|---|---|
| `@cosense-site-kit/theme-default` | ニュートラルな汎用テーマ。`page` / `profile`、ホーム / アーカイブ / タグ、Notion 風ホバー TOC、コードブロック copy ボタン | ドキュメントサイト、wiki、ノート公開、個人サイト |

他のテーマを作りたい場合は [docs/THEMES.md](./docs/THEMES.md) を参照。`@cosense-site-kit/theme-utils` の共有コンポーネント（`Inline.astro` / `PageContent.astro` / `Backlinks.astro` / `KaTeXLink.astro`）を再利用すれば、Layout と CSS を書くだけで自前テーマが立ち上がります。

### doctor のサポート

`cosense-site doctor` は使われているテンプレートの内訳と、`.site` の `templates:` マッピングが解決するかを検証します:
```
✓ Template usage  3 templates in use
    · 6× page
    · 2× profile
    · 1× landing
✓ Template mapping titles  2 mapping(s) all resolve
```

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
静的サイト → 配信先（GitHub Pages / Cloudflare Workers Static Assets）
   │
GitHub Actions cron（デフォルトで 1 日 2 回）が全体を再ビルド。
```

設計の核となるルール: **Cosense API の知識は `core/src/source/cosense/` と `core/src/parse/scrapbox.ts` だけに置く**。テーマ・Astro・CLI は中間モデルしか触りません。Cosense API が変わったとき、修正範囲はその 2 ファイルだけで済みます。

## パッケージ構成

| パッケージ | 役割 |
|---|---|
| `@cosense-site-kit/core` | fetch、cache、parse、normalize、schema、pipeline、doctor、config loader |
| `@cosense-site-kit/astro` | `cosense()` Integration、`cosenseLoader` Content Loader、`virtual:cosense-site-kit/site` & `structure` |
| `@cosense-site-kit/theme-utils` | テーマ作者向け共有ヘルパ (loadStructure / navHref / Backlinks 等) |
| `@cosense-site-kit/theme-default` | デフォルトテーマ (Layout、ページ、タグ、posts、ホーム) |
| `@cosense-site-kit/cli` | `cosense-site` バイナリ。GitHub Actions ワークフローと Cloudflare `wrangler.jsonc` のジェネレータも内蔵 |
| `create-cosense-site` | スカフォルダ（`npm create cosense-site …`） |

## CLI

```
cosense-site init                 cosense.config.ts のスターターを生成
cosense-site fetch  [--force]     ページ取得 → .cosense-cache/pages/ (差分 fetch)
                    [--export <file>]  追加で中間モデル全体を JSON ファイルに書き出し
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
  ✓ Publish rules produce pages  23 kept, 5 excluded
  ✓ Site-config page  ".site" parsed successfully
  ✗ Nav references resolve  1 nav reference(s) point to missing pages
      · "Contact" is not a published page
  ✓ Home reference resolves  home.page "Home" found
  ✓ Featured references resolve  2 featured item(s) all resolve
  ✓ Posts tag has content  4 page(s) tagged #post
  ✓ No orphan posts  every #post page is published
  ✓ Redirect destinations exist  no redirects
  ⚠ Internal page links resolve  4 broken page link target(s)
      · "Old Topic" referenced by 2 page(s) ("Notes", "Roadmap")
  ✓ Template usage  2 templates in use
      · 20× page
      · 3× profile
  ✓ Template mapping titles  1 mapping(s) all resolve
  ✓ No slug collisions  all slugs unique
  ✓ No draft leak  no excluded-tag pages published

Summary: 12 ok, 1 warn, 1 fail
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
    base: "/",                                        // GitHub Pages のサブパス用、例: "/my-site"
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

- `.github/workflows/build.yml` — checkout → Cosense cache 復元 → `cosense-site fetch` → `astro build` → `cloudflare/wrangler-action@v3` で Workers へ、または `actions/deploy-pages@v4` で GitHub Pages へ公開
- `wrangler.jsonc`（Cloudflare 用のみ） — Workers Static Assets を `./dist` に向けた設定

ビルドは cron + `workflow_dispatch` の併用が前提です。Cosense は分単位で更新するものではないので、1 日 2 回で十分です。

### GitHub Pages 用の追加設定

リポジトリの **Settings → Pages → Source** を **"GitHub Actions"** に切り替えます。

サブパス（`<user>.github.io/<repo>/` 形式の project pages）に配信する場合は `cosense.config.ts` の `site.base` を設定:

```ts
site: {
  baseUrl: "https://<user>.github.io",
  base: "/<repo>",                                    // 例: "/cosense-site-kit"
}
```

これで Astro の `base` 設定に渡り、内部リンク（`pathFor`）も自動で `/<repo>/...` プレフィックスを付けるようになります。

### Cloudflare Workers 用の追加設定

リポジトリ Secrets に2つ追加:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Monorepo（サイトが `<repo>/site/` 等のサブディレクトリ）

`cosense-site deploy init --working-directory site --repo-root ..` で、ワークフローが repo root の `npm ci` + 全パッケージ build を走らせる構成で生成されます（このリポジトリ自身がその構成です）。

## fetch キャッシュの仕組み

`.cosense-cache/pages/<shard>/<pageId>.json` に各ページの最新本文を保持します。`cosense-site fetch` は毎回 Cosense の一覧 API を呼んで `updated` タイムスタンプを比較し、変更されたページだけ本文を再取得します。キャッシュは `actions/cache@v4` で CI 実行間にまたがって永続化され、ビルド中にネットワーク障害が起きても直前の cache でビルドを継続できます。

`cosense-site fetch --force` でキャッシュを無視して全件再取得できます。

## スキーマのバージョニング

中間モデルは `schemaVersion: "1"` を持っています。スキーマ実体は `packages/core/src/schema/v1/` にあり、`@cosense-site-kit/core/schema` から re-export されています。v2 が必要になったとき、v1 はその場に残し、別ディレクトリで v2 とマイグレーションヘルパを並べる方針です。テーマは特定スキーマバージョンに pin して自分のペースで追従できます。

## ライセンス

MIT
