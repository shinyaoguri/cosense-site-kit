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
- **Cosense の記法をそのまま描画**。見出し・装飾・インラインコード/コードブロック（シンタックスハイライト）・数式（KaTeX）・引用・箇条書き/番号付き（ネスト対応）・テーブル（セル内の装飾・リンクも保持）・画像に加え、**YouTube URL の埋め込み**にも対応します。
- **安定した中間データモデル**。Cosense API は将来変更される可能性のある「内部 API」とみなし `core` に閉じ込めています。テーマはバージョン付きで zod 検証された中間スキーマだけを消費します。
- **`doctor` コマンド**。ナビの参照切れ・内部リンク切れ・draft タグの漏れ・公開ページ 0 件などを公開前に検出します。
- **SEO・共有・フィードを自動生成**。各ページに OpenGraph / Twitter Card / canonical / JSON-LD を出力し、`/sitemap.xml`・`/robots.txt`・`/feed.xml`（RSS 2.0、posts タグ）も自動で配信します。
- **404 ページも自動**。存在しない URL 用の 404 ページ（`dist/404.html`）を同梱します。基本的に設定は不要で、GitHub Pages はそのまま、Cloudflare も `deploy init` が生成する設定で配信します（詳細は[デプロイ](#デプロイ)）。
- **ゼロから動くサイトまで最短**。GitHub「Use this template」または `npx degit shinyaoguri/cosense-theme-default my-site` で、そのまま立ち上がるサイトが手に入ります。

## クイックスタート

```bash
# ブラウザだけ: GitHub で cosense-theme-default を「Use this template」
# CLI: degit で雛形を取得（.git なしで取得 → 自分のものとして開始）
npx degit shinyaoguri/cosense-theme-default my-site
cd my-site
# cosense.config.ts を編集: source.project（公開 Cosense プロジェクト名）と site.title / site.baseUrl
npm install
npm run fetch         # Cosense からページを取得 → .cosense-cache/
npm run dev           # http://localhost:4321
```

テーマは npm パッケージ `@cosense-site-kit/theme-default` として読み込まれます（`astro.config.ts` の `themeDefault()`）。テーマ本体は取得先に同梱されないので、`npm update` でテーマとフレームワークの改善をそのまま取り込めます。見た目は `themeDefault({ ... })` のオプション（`nav` / `siteTitle` / `copyright` / `search` や、配色を差し替える `preset`）と CSS 変数で調整します。別のテーマに切り替えるときは `astro.config.ts` の import をそのテーマパッケージに差し替えます。

## ページの公開制御

デフォルトでは何も公開されません。1ページずつ opt-in する設計です。

| タグ | 効果 |
|---|---|
| `#publish` | ページがビルド対象に含まれる（`publish.includeTags`） |
| `#draft` / `#private` / `#internal` | `#publish` があっても除外（`publish.excludeTags`） |
| `#slug/research` | URL スラッグを明示指定。無指定の場合はタイトルから生成 |
| `#post`（変更可） | `/posts` フィードとホームの「Recent posts」に表示。タグ名は `.site` の YAML で指定 |
| `#template/profile` | このページを `profile` テンプレートで描画。詳細は[テンプレート](#テンプレート) |
| `#published/2024-04-01` | 公開日を明示指定。無指定なら Cosense の作成日。詳細は[公開日・更新日](#公開日更新日の指定) |
| `#updated/2026-06-06` | 更新日を明示指定。無指定なら Cosense の更新日。詳細は[公開日・更新日](#公開日更新日の指定) |

「`#draft` 以外は全部公開」にしたい場合は `cosense.config.ts` で `publish.default: "all"` にします。

## 公開日・更新日の指定

各ページの公開日・更新日は、**デフォルトでは Cosense のタイムスタンプ**（作成日 / 最終更新日）が自動で使われます。「特定の日付を明示したい」ときだけ、ページ本文に**タグ**を足します（コードも設定も不要、ブラウザだけで完結）。

| やりたいこと | 書くタグ | 例 |
|---|---|---|
| 公開日を指定 | `#published/YYYY-MM-DD` | `#published/2024-04-01` |
| 更新日を指定 | `#updated/YYYY-MM-DD` | `#updated/2026-06-06` |

書く位置はページ内のどこでも構いません（他のタグと同じ行に並べて OK）:

```
About Me

私についての説明...

#publish #published/2024-04-01 #updated/2026-06-06
```

ルール:

- **フォーマットは厳格**: `YYYY-MM-DD`（ゼロ埋め必須、`2026-6-6` は不可）。ありえない日付（例 `2026-02-30`）や不正な文字列は**無視され、警告を出して** Cosense の日付にフォールバックします（ビルド / `npm run doctor` で警告が見えます）。
- **これらのタグは描画されません**: `#published/...` / `#updated/...` はメタデータ扱いで、タグチップとしては表示されません。
- **Cosense のタイムスタンプは常に保持**: タグは表示用の日付（`publishedAt` / `modifiedAt`）を上書きするだけで、生の作成日 / 更新日（`createdAt` / `updatedAt`）はスキーマに残ります。

指定した日付が効く場所:

- ページ上部に公開日を表示。更新日が公開日と異なる日付のときだけ `Updated YYYY-MM-DD` を併記
- ホーム / アーカイブ / `/posts` の**並び順**（公開日の新しい順）
- `/feed.xml` の `pubDate`（公開日）と `/sitemap.xml` の `lastmod`（更新日）

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
| `redirects` | `{oldSlug: newSlug}` | 明示的なリダイレクト。**出したいものだけ**書く。Astro の redirects 機構に流し込まれる |

### リダイレクト（明示・任意）

URL を変えたい・旧 URL を生かしたいときは、`.site` の `redirects:` に **出したいリダイレクトだけ**を `旧slug: 新slug` で書きます。ブラウザ（Cosense）だけで管理でき、コード変更は不要です。

> **注意**: slug はタイトル由来なので、Cosense でページ名を変えると URL も変わります。旧 URL を残したい場合は、その旧 slug → 新 slug を上の `redirects:` に明示的に足してください（自動生成はしません）。

`npm run doctor` の「Redirect destinations exist」が、行き先が実在ページかを検査します。

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
| `@cosense-site-kit/theme-default` | ニュートラルな汎用テーマ。`page` / `profile`、ホーム / アーカイブ / タグ、Notion 風ホバー TOC、コードブロック copy ボタン。`light` / `dark` スキン | ドキュメントサイト、wiki、ノート公開、個人サイト |

theme-default は本体同梱（npm）の「ライブラリ型」テーマで、**唯一の公式テーマ**です。それ以外のテーマは **すべてサードパーティ** — ユーザが自由に作り、「Use this template」リポジトリとして共有するものです。

### 公式テーマで始める（Use this template）

ブラウザだけで新しいサイトを作れます。公式の出発点は `default` テーマの「動くサイト」リポジトリです。テーマ本体は npm パッケージ `@cosense-site-kit/theme-default` から読み込むので（リポジトリには同梱しません）、`npm update` で改善にそのまま追従できます。リポジトリに置くのは設定（`cosense.config.ts` / `astro.config.ts` / `content.config.ts`）とデプロイ workflow だけ。

| テーマ | id | リポジトリ | 用途 |
|---|---|---|---|
| Default | `default` | [cosense-theme-default](https://github.com/shinyaoguri/cosense-theme-default) | 汎用・ドキュメント・個人サイト |

```bash
npx degit shinyaoguri/cosense-theme-default my-site
```

### テーマのカスタマイズ：npm import と vendored

theme-default は **2 通り**にカスタマイズできます。`cosense.config.ts` はどちらでも共通です。

1. **npm import（既定。上記スターターのモード）** — `@cosense-site-kit/theme-default` を import するだけ。ルート・テンプレート・スタイルはパッケージ（`node_modules`）が提供し、改善は **`npm update` で追従**できます。見た目は `themeDefault({ ... })` の options・`preset`（CSS 変数）・`.site` の `theme.skin` で調整します。このドキュメントサイト自身（[site/](site/)）もこのモードです。
2. **vendored（手動）** — さらに作り込みたいときは、テーマパッケージが同梱する `src/`（生の `.astro` テンプレート）を自分のリポジトリにコピーし、`astro.config.ts` から参照します。`.astro` を直接書き換えられますが、`npm update` の自動追従からは外れ、テーマ本体の改善は手動マージになります。

npm import の最小構成は 3 ファイルだけ:

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import cosense from "@cosense-site-kit/astro";
import themeDefault from "@cosense-site-kit/theme-default";

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    themeDefault({ copyright: "You" }), // 見た目は options / preset / .site の theme.skin で調整
  ],
});
```

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { cosenseLoader, cosenseSchema } from "@cosense-site-kit/astro";

export const collections = {
  pages: defineCollection({
    loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
    schema: cosenseSchema,
  }),
};
```

```jsonc
// package.json（dependencies 抜粋）
"@cosense-site-kit/astro": "^0.1",
"@cosense-site-kit/cli": "^0.1",
"@cosense-site-kit/core": "^0.2",
"@cosense-site-kit/theme-default": "^0.2",
"astro": "^6"
```

| | npm import（既定） | vendored（手動コピー） |
|---|---|---|
| テンプレの所在 | `node_modules`（読み取り専用） | リポジトリの `src/`（編集自由） |
| 見た目の作り込み | options / `preset`（CSS 変数） / `.site` の `theme.skin` | `.astro` を直接書き換え |
| テーマ改善の取り込み | `npm update` | 手動マージ |
| 向いている人 | 早く立ち上げ、本体更新に追従したい | デザインを本格的に作り込む |

迷ったら **npm import** のままで OK。テンプレートを本格的に作り込みたくなったら、テーマの `src/` を自分のリポジトリにコピーして vendored へ移行できます。`cosense.config.ts` と `.site` はそのまま使えます。

### サードパーティ／自作テーマ

`default` 以外のテーマはすべてサードパーティです。誰でも「フレームワーク（`@cosense-site-kit/*`）に依存し、`@cosense-site-kit/theme-utils` で本文を描画する Astro Integration」を作り、テーマソースを同梱した **Use this template リポジトリ**として配布できます。作り方は [docs/THEMES.md](./docs/THEMES.md)。

```bash
npx degit <user/repo> my-site   # 任意のテーマリポジトリを取得
```

参考実装として、研究室向けテーマ [cosense-theme-lab](https://github.com/shinyaoguri/cosense-theme-lab)（メンバー / 研究テーマ / 業績 / お知らせ、独立ルートを inject する構造の異なるテーマ）があります。公式テーマではなく、サードパーティテーマの作り方の見本です。

### スキン（preset）

配色やフォントだけを変える「着せ替え」は、**新しいテーマパッケージを作らず preset で行います**。preset は `:root` の CSS 変数（デザイントークン）を上書きするだけのデータで、`.astro` を一切書く必要がありません。新テンプレと違って描画ロジックを複製しないので、保守コストが増えません。

**いちばん簡単な切り替え方（コード不要・ブラウザだけ）**: Cosense の `.site` ページの `code:site.yaml` に `theme.skin` を書くだけ。リポジトリもコードも触らず、次回のビルドで反映されます。

```yaml
# .site の code:site.yaml（Cosense 上＝ブラウザで編集）
theme:
  skin: dark        # 同梱: light / dark
```

`astro.config.ts` 側で `preset` を指定する開発者向けの方法もあります（既定のスキン）。両方ある場合は **`.site` の指定が優先**されます（運用者が Cosense だけで切り替えられるように）。

```ts
// astro.config.ts
import themeDefault, { presetDark } from "@cosense-site-kit/theme-default";

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    themeDefault({ preset: presetDark }),   // ダークスキン
  ],
});
```

`preset` に渡せる形:

| フィールド | 用途 |
|---|---|
| `tokens` | `:root` の CSS 変数上書き（例 `{ "--color-bg": "#191919" }`）。`<html>` のインライン style として注入されるので stylesheet の順序に関係なく確実に勝つ |
| `colorScheme` | `"light"` / `"dark"`。`<html>` の color-scheme を設定し、スクロールバー等ネイティブ UI の配色を合わせる |
| `fontHref` | フォントの stylesheet URL を差し替える（`--font-*` トークンと併用） |
| `options` | nav / copyright などテーマ options の既定値。直接渡した options が優先 |

同梱 preset は `presetDark`（Notion 風の暖色を保ったダーク）。独自スキンは preset オブジェクトを書いて `preset:` に渡すだけです:

```ts
themeDefault({
  preset: {
    name: "sepia",
    tokens: { "--color-bg": "#faf4e8", "--color-text": "#433422" },
  },
});
```

### doctor のサポート

`npm run doctor` は使われているテンプレートの内訳と、`.site` の `templates:` マッピングが解決するかを検証します:
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

## 日常の操作（npm scripts）

スターターには npm scripts が用意されているので、ふだんは次のコマンドだけで完結します（内部で Astro と `cosense-site` CLI が動きます。CLI を直接覚える必要はありません）:

| コマンド | 動作 |
|---|---|
| `npm run dev` | 開発サーバー（http://localhost:4321）。Cosense から取得して描画 |
| `npm run build` | Cosense 取得 → `astro build` で `dist/` を生成 |
| `npm run fetch` | Cosense から取得して `.cosense-cache/` を更新（差分） |
| `npm run validate` | fetch せずに `cosense.config.ts` を検証・要約 |
| `npm run doctor` | 公開前診断（publish 結果・リンク切れ・構造参照）。CI ゲート向け |

長期運用の観点で最も効くのが `npm run doctor` です。実行例:

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

### 高度な使い方（`cosense-site` を直接呼ぶ）

上記スクリプトの実体は `cosense-site`（`@cosense-site-kit/cli`）です。テンプレートを使うなら意識不要ですが、**既存の Astro プロジェクトに後付けする**・**配信設定を生成し直す**ときだけ直接呼びます:

```
cosense-site init                 cosense.config.ts の雛形を生成
cosense-site deploy init          .github/workflows/build.yml と wrangler.jsonc を生成
                                  （target / schedule は cosense.config.deploy から）
```

テンプレート（[cosense-theme-default](https://github.com/shinyaoguri/cosense-theme-default) を degit）には config も workflow も同梱済みなので、これらは通常不要です。ほかに `cosense-site fetch --export <file>`（中間モデル全体を JSON 出力）などの細かいフラグもあります。

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
- `wrangler.jsonc`（Cloudflare 用のみ） — Workers Static Assets を `./dist` に向けた設定（404 ページ配信のための `not_found_handling: "404-page"` を含む）

ビルドは cron + `workflow_dispatch` の併用が前提です。Cosense は分単位で更新するものではないので、1 日 2 回で十分です。

**すぐ反映したいとき（手動リビルド）**: cron は最大で半日ほど遅延します。Cosense を編集してすぐ公開したい場合は、生成された `build.yml` が `workflow_dispatch` を持つので、GitHub の **Actions タブ → 対象ワークフロー → Run workflow** から手動実行できます（差分 fetch のキャッシュが効くので速い）。Cosense には Webhook がないため、これが「今すぐ再ビルド」の標準手段です。

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

### 404 ページ

存在しない URL 用の 404 ページはテーマが自動で用意します（`dist/404.html`）。**基本的に設定は不要**です。

- **GitHub Pages**: 追加設定なしで `404.html` を配信します。
- **Cloudflare Workers**: `cosense-site deploy init` が生成する `wrangler.jsonc` に `assets.not_found_handling: "404-page"` が入るので、新規サイトはそのまま動きます。**この機能より前に生成した既存サイト**だけ、設定を取り込むため一度だけ再生成してください:

  ```bash
  cosense-site deploy init --target cloudflare-workers --force
  ```

見た目はテーマ共通で、`themeDefault()` の CSS 変数や `preset`（配色）がそのまま 404 ページにも反映されます。ヘッダーと検索ボックスも表示されるので、迷った読者はそのまま検索やホームへ戻れます。

### Monorepo（サイトが `<repo>/site/` 等のサブディレクトリ）

`cosense-site deploy init --working-directory site --repo-root ..` で、ワークフローが repo root の `npm ci` + 全パッケージ build を走らせる構成で生成されます（このリポジトリ自身がその構成です）。

## fetch キャッシュの仕組み

`.cosense-cache/pages/<shard>/<pageId>.json` に各ページの最新本文を保持します。`cosense-site fetch` は毎回 Cosense の一覧 API を呼んで `updated` タイムスタンプを比較し、変更されたページだけ本文を再取得します。キャッシュは `actions/cache@v4` で CI 実行間にまたがって永続化され、ビルド中にネットワーク障害が起きても直前の cache でビルドを継続できます。

`cosense-site fetch --force` でキャッシュを無視して全件再取得できます。

## スキーマのバージョニング

中間モデルは `schemaVersion: "1"` を持っています。スキーマ実体は `packages/core/src/schema/v1/` にあり、`@cosense-site-kit/core/schema` から re-export されています。

> **pre-1.0 の注意**: 安定版（1.0）までは、この中間スキーマも予告なく破壊的に変更することがあります（`schemaVersion` は据え置きのまま形を変える場合があります）。「v1 を凍結し、破壊的変更は v2 とマイグレーションヘルパを並べて行う／テーマは特定バージョンに pin して追従する」というのは **1.0 以降の約束**です。

## 開発・コントリビュート

このリポジトリ自体の開発 — セットアップ、ビルド/テスト/lint、ドキュメントサイト（`site/`）のローカル確認、**CI 構成（GitHub Pages デプロイと npm 公開）とリリースフロー（changesets + trusted publishing）** — は [CONTRIBUTING.md](CONTRIBUTING.md) にまとめています。テーマ自作の詳細は [docs/THEMES.md](docs/THEMES.md)。

## ライセンス

MIT
