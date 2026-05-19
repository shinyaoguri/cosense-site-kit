# テーマを自作する

cosense-site-kit のテーマは **Astro Integration の薄いラッパ** です。「テーマ」と聞くと CSS だけのものを想像しがちですが、ここでのテーマは **URL の構造 (どのページがどの URL になるか) も含めて決める** ものを指します。WordPress でいう "テンプレート階層" に近い役割です。

本ドキュメントは、`theme-default` を読みながら自作するときのリファレンスです。最小実装から始めて、機能を追加していく順で説明します。

---

## 目次

1. [テーマとは何か](#テーマとは何か)
2. [最小のテーマ](#最小のテーマ)
3. [パッケージ構成](#パッケージ構成)
4. [データレイヤ](#データレイヤ)
   - [`pages` collection](#pages-collection)
   - [`virtual:cosense-site-kit/site`](#virtualcosense-site-kitsite)
   - [`virtual:cosense-site-kit/structure`](#virtualcosense-site-kitstructure)
   - [`@cosense-site-kit/theme-utils`](#cosense-site-kittheme-utils)
5. [ルートの登録](#ルートの登録)
6. [テンプレートディスパッチ](#テンプレートディスパッチ)
7. [テーマオプション](#テーマオプション)
8. [Inline / PageContent の実装](#inline--pagecontent-の実装)
9. [スタイル](#スタイル)
10. [型シム](#型シム)
11. [ビルド設定](#ビルド設定)
12. [配布チェックリスト](#配布チェックリスト)

---

## テーマとは何か

cosense-site-kit のテーマは Astro Integration として実装され、次の3つを提供します:

1. **ルート**: `/`, `/<slug>`, `/tags/[tag]` 等を `injectRoute()` で Astro に登録
2. **テンプレート**: 各ルートに対応する `.astro` ファイル群
3. **見た目**: CSS と HTML マークアップ

データは framework が用意した3つのインタフェースから取得します:

| インタフェース | 内容 | API |
|---|---|---|
| `pages` collection | 公開済みページ一覧 (1ページ = 1エントリ) | `getCollection("pages")` |
| `virtual:cosense-site-kit/site` | `cosense.config.ts` の `site` ブロック (title / baseUrl / lang 等) | `import site from "..."` |
| `virtual:cosense-site-kit/structure` | `.site` ページの YAML から解析された `SiteStructure` (nav / home / posts / templates 等) | `import structure from "..."` |

テーマは **Cosense API を直接触らず**、これらだけを消費します。

---

## 最小のテーマ

`/` と `/<slug>` だけ提供する最小のテーマ:

```ts
// src/index.ts
import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export default function themeMinimal(): AstroIntegration {
  // .astro / .css は tsup でバンドルされないので、dist/index.js から
  // ../src/<path> として参照する。
  const here = (p: string) =>
    fileURLToPath(new URL(`../src/${p}`, import.meta.url));

  return {
    name: "my-theme",
    hooks: {
      "astro:config:setup": ({ injectRoute }) => {
        injectRoute({ pattern: "/", entrypoint: here("templates/home.astro") });
        injectRoute({ pattern: "/[...slug]", entrypoint: here("templates/page.astro") });
      },
    },
  };
}
```

```astro
---
// src/templates/page.astro
import { getCollection, type CollectionEntry } from "astro:content";

export async function getStaticPaths() {
  const pages = await getCollection("pages");
  return pages.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props as { entry: CollectionEntry<"pages"> };
const page = entry.data;
---
<html>
  <body>
    <h1>{page.title}</h1>
    <pre>{JSON.stringify(page.blocks, null, 2)}</pre>
  </body>
</html>
```

`home.astro` も同様。これで cosense-site-kit が用意した `pages` collection を消費する Astro テーマとして成立します。

---

## パッケージ構成

```
packages/my-theme/
  package.json
  tsconfig.json
  tsup.config.ts
  src/
    index.ts                  # Integration 本体
    astro-shims.d.ts          # 開発時の型シム
    virtual/
      site.d.ts               # virtual:cosense-site-kit/site の型シム
      structure.d.ts          # virtual:cosense-site-kit/structure の型シム (theme-utils 経由なら不要)
      options.d.ts            # 自分のテーマの options の型シム
    components/
      Layout.astro              # head + Header + slot + Footer
      Header.astro              # サイトナビ
      Footer.astro              # フッタ
    templates/
      _dispatcher.astro         # /<slug> をテンプレ振り分け
      home.astro                # /
      page.astro                # default テンプレ
      profile.astro             # オプション例
      tag.astro                 # /tags/[tag]
    styles/
      global.css
    lib/                        # 補助関数 (必要なら)
```

`PageContent.astro` / `Inline.astro` は `@cosense-site-kit/theme-utils/components/` から **そのまま import するのを推奨** します。Cosense AST → HTML マッピングはテーマ毎に持つ意味がなく、parser に新しいノードが増えた時の追随コストが下がります。レイアウト・配色・ナビなどテーマらしさが出る部分（Layout / Header / Footer / global.css）に集中してください。

最小限なら `templates/` と `components/Layout.astro` だけでも作れますが、`theme-default` を参考にすると着地点が見えやすいです。

---

## データレイヤ

### `pages` collection

公開済み (`#publish` タグ付き、`excludeTags` に該当しないもの) Cosense ページが入った Astro Content Collection です。1ページ = 1エントリ、`entry.data` の型は `CosenseSitePage`:

```ts
interface CosenseSitePage {
  schemaVersion: "1";
  id: string;            // Cosense の内部 ID
  title: string;         // ページタイトル
  slug: string;          // URL 用スラッグ (assignSlugs() の結果)
  sourceUrl: string;     // https://scrapbox.io/proj/Title
  template: string;      // resolveTemplate() の結果 (デフォルト "page")
  createdAt?: string;    // ISO timestamp
  updatedAt?: string;
  summary?: string;      // 1段落目のテキスト
  tags: string[];        // #publish も含む生のタグ配列
  links: string[];       // [Other Page] で参照したタイトル一覧
  backlinks: string[];   // このページにリンクしている他ページのタイトル
  blocks: CosenseBlock[]; // パース済み本文
  raw?: { text?: string };
}
```

利用例:

```ts
import { getCollection } from "astro:content";

const all = await getCollection("pages");
const recent = all
  .filter((e) => e.data.tags.includes("blog"))
  .sort((a, b) =>
    (b.data.updatedAt ?? "").localeCompare(a.data.updatedAt ?? ""),
  )
  .slice(0, 10);
```

### `virtual:cosense-site-kit/site`

`cosense.config.ts` の `site` ブロックを返す virtual module です。タイトルやベース URL を取得する用途で、操作者がテーマと cosense.config.ts に二度同じ値を書かなくて済みます。

```ts
import site from "virtual:cosense-site-kit/site";
// site.title, site.description?, site.baseUrl, site.lang, site.base
```

### `virtual:cosense-site-kit/structure`

`.site` ページの `code:site.yaml` を解析した `SiteStructure` を返します:

```ts
interface SiteStructure {
  home?: { page: string };
  nav: NavItem[];                 // [{ label, page }] or [{ label, href }]
  posts?: { tag: string; limit?: number; route?: string };
  featured: string[];             // Cosense title 配列
  redirects: Record<string, string>;
  templates: Record<string, string>;  // title -> template name
  // .passthrough() なのでテーマ独自セクションも保持される
}
```

直接 import するより、後述の `@cosense-site-kit/theme-utils` の `loadStructure()` を使うのがおすすめ (将来の互換性のため)。

### `@cosense-site-kit/theme-utils`

テーマで頻出する処理をまとめたヘルパパッケージ:

```ts
import {
  loadStructure,      // () => Promise<SiteStructure>
  loadTitleToSlug,    // () => Promise<Map<title, slug>>
  navHref,            // (item, titleToSlug) => string (BASE_URL 自動付与)
  path,               // (slug) => string (BASE_URL を前置)
  isPublicTag,        // (name) => boolean — /tags/<name> に出すべきか
  isHiddenTag,        // (name) => boolean — publish/draft 等の制御タグ
} from "@cosense-site-kit/theme-utils";

import Backlinks from "@cosense-site-kit/theme-utils/components/Backlinks.astro";
```

| 関数 | 用途 |
|---|---|
| `loadStructure()` | テーマ内で `.site` 設定を読む。サイトに `.site` が無い場合は空の structure を返す (例外を出さない) |
| `loadTitleToSlug()` | `.site` の `nav: [{ label, page }]` 等で参照される Cosense title を、実際の URL slug に変換するための map |
| `navHref(item, titleToSlug)` | `page` 形式と `href` 形式の両方を解決して URL を返す。`/blog` のようなサイト相対パスは `BASE_URL` を自動で前置 |
| `path(slug)` | `pathFor(slug, BASE_URL)` の thin wrapper。GitHub Pages の subpath デプロイでも壊れない |
| `isPublicTag` / `isHiddenTag` | inline rendering で `#publish` 等の制御タグを非表示にし、`template/<name>` 等の名前空間付きタグは tag chip だけ抑制する |

`Backlinks.astro` はそのまま使える共有コンポーネント (`<Backlinks backlinks={page.backlinks} />`)。

---

## ルートの登録

テーマの `astro:config:setup` フックで `injectRoute()` を呼び、各 URL パターンに `.astro` ファイルを紐付けます。

```ts
"astro:config:setup": ({ injectRoute }) => {
  const here = (p: string) =>
    fileURLToPath(new URL(`../src/${p}`, import.meta.url));

  injectRoute({ pattern: "/", entrypoint: here("templates/home.astro") });
  injectRoute({ pattern: "/blog", entrypoint: here("templates/blog-index.astro") });
  injectRoute({ pattern: "/tags/[tag]", entrypoint: here("templates/tag.astro") });
  injectRoute({ pattern: "/[...slug]", entrypoint: here("templates/_dispatcher.astro") });
},
```

`here()` のパス計算が必要なのは、`tsup` が `.astro` / `.css` ファイルをバンドルしないためです (テーマパッケージは `dist/index.js` だけがコンパイル対象で、`.astro` は **生のまま** `src/` から配布する規約)。`dist/index.js` 起点で `../src/...` と書くのが正解。

---

## テンプレートディスパッチ

`/[...slug]` ルートに直接 `page.astro` を当てると全ページ同じ見た目になります。WordPress のテンプレート階層と同じく **ページごとに違うテンプレート** を当てたい場合は、間に `_dispatcher.astro` を挟みます:

```astro
---
// src/templates/_dispatcher.astro
import { getCollection, type CollectionEntry } from "astro:content";
import Page from "./page.astro";
import Profile from "./profile.astro";
import Cv from "./cv.astro";

const TEMPLATES: Record<string, typeof Page> = {
  page: Page,
  profile: Profile,
  cv: Cv,
};

export async function getStaticPaths() {
  const pages = await getCollection("pages");
  return pages.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props as { entry: CollectionEntry<"pages"> };
// entry.data.template はパイプラインが事前に解決済み:
//   1. #template/<name> タグ
//   2. .site の templates: マッピング
//   3. デフォルト "page"
const Template = TEMPLATES[entry.data.template] ?? Page;
---
<Template entry={entry} />
```

テンプレートは Astro コンポーネント (`(props: { entry: CollectionEntry<"pages"> }) => Renderable`) として実装します。`theme-default` の `templates/page.astro`, `templates/profile.astro` がほぼそのまま雛形になります。

**特殊な振り分けが必要なケース** (例: `#blog` タグ付きを問答無用で `blog-post` テンプレで描画したい) では、`TEMPLATES[name]` ルックアップの前に条件で割り込みます:

```ts
const isBlogPost = entry.data.tags.includes(options.blogTag);
const Template = isBlogPost
  ? BlogPost
  : (TEMPLATES[entry.data.template] ?? Page);
```

---

## テーマオプション

テーマ利用者が `astro.config.ts` で渡せる設定を、テンプレート (`.astro` 内) から参照するには **virtual options module** パターンを使います:

```ts
// src/index.ts
export interface MyThemeOptions {
  siteTitle?: string;
  nav?: { label: string; page?: string; href?: string }[];
}

const VIRTUAL_ID = "virtual:my-theme/options";
const VIRTUAL_RESOLVED = `\0${VIRTUAL_ID}`;

export default function myTheme(opts: MyThemeOptions = {}): AstroIntegration {
  const options = {
    siteTitle: opts.siteTitle,
    nav: opts.nav ?? [],
  };

  return {
    name: "my-theme",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        updateConfig({
          vite: { plugins: [virtualOptionsPlugin(options)] },
        });
        // ... injectRoute calls ...
      },
    },
  };
}

function virtualOptionsPlugin(options: unknown) {
  return {
    name: "my-theme-virtual-options",
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return VIRTUAL_RESOLVED;
      return null;
    },
    load(id: string) {
      if (id === VIRTUAL_RESOLVED) {
        return `export default ${JSON.stringify(options)};`;
      }
      return null;
    },
  };
}
```

これでテンプレート側から:

```astro
---
import options from "virtual:my-theme/options";
---
<h1>{options.siteTitle ?? "Untitled"}</h1>
```

`virtual:my-theme/options` の型は `src/virtual/options.d.ts` に書くと開発時に補完が効きます (詳細は[型シム](#型シム)節)。

注意点:

- options は `JSON.stringify` されて `.astro` に注入されます。**関数や Astro Component は渡せません** (シリアライズ不能)。値を渡せるのは JSON 可能な型のみ。
- `nav` などのフォールバックは、テーマ側ではなく `.site` YAML の値が優先されるのが慣習 (cosense-site-kit のテーマは「Cosense 側で書ける設定は Cosense 側を優先」が原則)。

---

## Inline / PageContent の実装

`CosenseSitePage.blocks` は構造化されたパース済みデータ (`paragraph` / `heading` / `list` / `code` / `image` / `embed` / `table` / `raw`) です。**通常はテーマ作者がこれを HTML に変換するロジックを書く必要はありません**。`@cosense-site-kit/theme-utils/components/` の `PageContent.astro` と `Inline.astro` をそのまま import してください:

```astro
---
// src/templates/page.astro
import Layout from "../components/Layout.astro";
import PageContent from "@cosense-site-kit/theme-utils/components/PageContent.astro";

interface Props { entry: { data: CosenseSitePage } }
const { entry } = Astro.props;
---
<Layout title={entry.data.title}>
  <PageContent blocks={entry.data.blocks} />
</Layout>
```

`PageContent` は以下のオプションを受けます:

| Prop | Default | 用途 |
|---|---|---|
| `blocks` | (必須) | `CosenseSitePage.blocks` |
| `hideFilenames` | `[]` | `code:<filename>` のうち本文表示から除外するもの。`site.yaml` は常に除外（フレームワークがサイト設定として消費するため） |
| `class` | `"page-content"` | wrapper `<div>` のクラス。例: `class="page-content prose"` |

タグ・公開フィルタなど Cosense 固有の意味論は `Inline.astro` 内で正しく扱われます (`isPublicTag` / `isHiddenTag`)。

### 自前で実装したい場合

CSS だけでは届かない構造変更（例: heading レベルを `h2`/`h3`/`h4` ではなく `h3`/`h4`/`h5` にする、コードブロックをカスタム element でラップする）が必要なら、theme-utils のコンポーネントを直接 import せず、自分で `PageContent.astro` を書きます。実装は theme-utils のソースをコピーして調整するのが早いです:

```astro
case "tag":
  if (isHiddenTag(node.name)) return null;
  if (!isPublicTag(node.name)) {
    return <span class="tag tag-meta">#{node.name}</span>;
  }
  return <a class="tag" href={path(`tags/${node.name}`)}>#{node.name}</a>;
```

実装例は [`packages/theme-utils/src/components/`](../packages/theme-utils/src/components/) を参照。

### Cosense の装飾はネストしない

Cosense のグラマーは「装飾の中の装飾」をサポートしません。`[**** outer [**** inner]]` のような書き方をすると、内側の `[**** inner]` は **装飾ではなく相対パスの内部リンク**として解釈され、`pageLink` ノードの `exists=false` になります。これは @progfay/scrapbox-parser だけの挙動ではなく Cosense 本体も同じです。

ネストできる組み合わせは次の通り:

| 構造 | 例 | 結果 |
|---|---|---|
| 装飾の中にリンク | `[* [Page]]` | OK |
| 装飾の中に外部リンク | `[* [https://x.com 表示]]` | OK |
| 装飾の中にタグ | `[* #tag 続き]` | OK |
| 装飾の中にインライン code | `` [* `code`] `` | 装飾が壊れる |
| 装飾の中に装飾 | `[* [/ italic]]` | 内側は不在ページリンクになる |
| リンクの中に装飾 | `[[* bold] in link]` | 外側の `[` `]` がリテラル化する |

そのため `.page-link.missing` を `text-decoration: line-through` にすると、Cosense の `[- strike]` 装飾と「壊れた装飾入れ子」と「未作成ページリンク」が全部同じ見た目になり混乱します。theme-default では **ドットアンダーライン** にして、ユーザーが装飾入れ子のミスを誤って strikethrough と読まないようにしています。新しいテーマでも同じ慣習を強く推奨します。

---

## スタイル

`src/styles/global.css` を作って Layout から `import` するだけです。CSS フレームワークに依存せず素 CSS で書くのを推奨 (theme-default は素 CSS):

```astro
---
// src/components/Layout.astro
import "../styles/global.css";
---
```

`.astro` 内の `<style>` は scoped、ファイル単位で隔離されます。

GitHub Pages のサブパス公開に対応するには、テンプレート内のパス生成に **必ず `path(slug)` (= `import.meta.env.BASE_URL` 前置)** を使ってください。生のスラッシュ ` "/" ` 直書きは avoid:

```astro
<!-- ❌ サブパスで壊れる -->
<a href={`/${entry.data.slug}`}>...</a>

<!-- ✅ -->
<a href={path(entry.data.slug)}>...</a>
```

---

## 型シム

開発時 (`tsc --noEmit`) に virtual module の型が解決できるよう、`.d.ts` シムを置きます。Astro 利用者側ではこれらは Astro の typegen が上書きするので、シム自体は dist に含めず src のみで持ちます。

```ts
// src/astro-shims.d.ts
/// <reference types="astro/client" />

declare module "astro:content" {
  export type CollectionEntry<_T extends string = string> = {
    id: string;
    data: any; // Astro の typegen が consumer 側で正しい型に差し替える
  };
  export function getCollection<T extends string = string>(
    collection: T,
  ): Promise<CollectionEntry<T>[]>;
  export function getEntry<T extends string = string>(
    collection: T,
    id: string,
  ): Promise<CollectionEntry<T> | undefined>;
}
```

```ts
// src/virtual/site.d.ts
declare module "virtual:cosense-site-kit/site" {
  export interface CosenseSiteInfo {
    title: string;
    description?: string;
    baseUrl: string;
    lang: string;
    base: string;
  }
  const site: CosenseSiteInfo;
  export default site;
}
```

```ts
// src/virtual/options.d.ts (自テーマの options 用)
declare module "virtual:my-theme/options" {
  export interface MyThemeOptions {
    siteTitle?: string;
    nav: { label: string; page?: string; href?: string }[];
  }
  const options: MyThemeOptions;
  export default options;
}
```

`virtual:cosense-site-kit/structure` を直接使う場合は `theme-utils` が同梱しているシムを参照 (`packages/theme-utils/src/virtual/structure.d.ts`) してください。`loadStructure()` 経由なら不要。

---

## ビルド設定

### `package.json`

```json
{
  "name": "@your-scope/theme-foo",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./components/*": "./src/components/*",
    "./templates/*": "./src/templates/*",
    "./styles/*": "./src/styles/*"
  },
  "files": ["dist", "src/components", "src/templates", "src/styles", "src/virtual"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": { "astro": "^5.0.0" },
  "dependencies": {
    "@cosense-site-kit/core": "^0.1.0",
    "@cosense-site-kit/theme-utils": "^0.1.0"
  }
}
```

**重要なポイント**:

- `files` に `src/components`, `src/templates`, `src/styles`, `src/virtual` を含める — テンプレート (`.astro` 生ファイル) は **dist にバンドルされず、`src/` から直接配布** されるため
- `exports` で `./components/*`, `./templates/*` をパス export — 他者が `import X from "@your-scope/theme-foo/components/X.astro"` できるようにするため
- `astro` は **peerDependency** にする (Astro バージョンの一意性を保証)

### `tsup.config.ts`

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  // .astro / virtual module は外部扱い (バンドル対象から除外)
  external: ["astro", "astro:content", "virtual:cosense-site-kit/site"],
});
```

### `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "preserve",
    "types": ["astro/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"]
}
```

---

## 配布チェックリスト

公開する前に確認:

- [ ] `npm run build` で `dist/` が生成される (`index.js` + `index.d.ts` + sourcemap)
- [ ] `npm pack --dry-run` で同梱される予定のファイルを確認 — `dist/`, `src/components/`, `src/templates/`, `src/styles/`, `src/virtual/` が入っていること
- [ ] 別ディレクトリで `npm create cosense-site test --project some-public-proj` → `npm install <自テーマ tarball>` → `astro build` を一度通す
- [ ] `peerDependencies` の Astro バージョン範囲が現実的か (狭すぎず広すぎず)
- [ ] README にスクリーンショットと最小設定例 (`astro.config.ts` での書き方) を載せる
- [ ] `.site` YAML で必要なフィールド (`templates:` mapping 等) があればドキュメント化

---

## 参考実装

迷ったら以下の実装を読むのが早いです:

| | 役割 | ポイント |
|---|---|---|
| [`packages/theme-default/`](../packages/theme-default/) | `page` / `profile` の2テンプレ + `/posts` archive + `/tags/[tag]` + Notion 風ホバー TOC | テーマの最小実用形 |
| [`packages/theme-utils/`](../packages/theme-utils/) | 共有ヘルパ + 共有コンポーネント (`Inline.astro`, `PageContent.astro`, `Backlinks.astro`, `KaTeXLink.astro`) | 自前で同等の処理を書く前に参照 |
