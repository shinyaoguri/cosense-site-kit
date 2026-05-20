# @cosense-site-kit/theme-lab

大学・研究所の研究室サイト向けテーマ。**メンバー一覧 / 研究テーマ一覧 / 業績 / お知らせ** を 1 つの Cosense プロジェクトから生成します。

> 叩き台 (scaffold) として提供しています。視覚デザイン・テンプレ構成は実プロジェクトでカスタムする前提です。

---

## できること

| URL | テンプレ | データソース |
|---|---|---|
| `/` | `home.astro` | `Home` ページの本文 + Featured research + Recent news |
| `/research` | `research-index.astro` | `#research` タグ付きページ一覧 (カードグリッド) |
| `/<research page>` | `research-post.astro` | 個別研究テーマページ |
| `/news` | `news-index.astro` | `#news` タグ付きページ一覧 (日付テーブル) |
| `/<news page>` | `news-post.astro` | 個別ニュース記事 |
| `/<members page>` | `members.astro` | `code:members.yaml` ブロック付きページ |
| `/<publications page>` | `publications.astro` | `code:publications.yaml` ブロック付きページ |
| `/tags/[tag]` | `tag.astro` | タグ別ページ一覧 |
| `/<page>` | `page.astro` | その他全ページ (デフォルト) |

---

## astro.config.ts

```ts
import { defineConfig } from "astro/config";
import cosense from "@cosense-site-kit/astro";
import themeLab from "@cosense-site-kit/theme-lab";

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    themeLab({
      // 全部 optional。siteTitle / nav は cosense.config と .site から自動取得。
      affiliation: "Aichi Institute of Technology",
      researchTag: "research",   // 既定: "research"
      newsTag: "news",            // 既定: "news"
      copyrightHolder: "Lab Name",
    }),
  ],
});
```

---

## Cosense 側のページ構成

### `.site` (必須)

```yaml
site:
  title: "Foo Lab"
  description: "Foo Lab — Department of X, University Y"
  baseUrl: "https://foo-lab.example"
  lang: "ja"

home:
  page: "Home"

nav:
  - { label: "About",        page: "About" }
  - { label: "Members",      page: "Members" }
  - { label: "Research",     href: "/research" }
  - { label: "Publications", page: "Publications" }
  - { label: "News",         href: "/news" }
  - { label: "Contact",      page: "Contact" }

posts:
  tag: "news"
  limit: 10

featured:
  - "Research/水引アート支援"
  - "Research/プロジェクションマッピング"

templates:
  "Members":      members
  "Publications": publications
```

`templates:` マッピングで `Members` と `Publications` ページを専用テンプレに振り分けます。

### `Members` ページ — `code:members.yaml`

````
Members

このページは研究室メンバー一覧です。

code:members.yaml
 groups:
   - name: "Faculty"
     members:
       - name: "山田 太郎"
         role: "教授"
         photo: "https://example.com/yamada.jpg"
         bio: "..."
         links:
           - { label: "Web",        url: "https://yamada.example/" }
           - { label: "researchmap", url: "https://researchmap.jp/yamada" }
   - name: "PhD Students"
     members:
       - name: "佐藤 花子"
         role: "D2"
         bio: "句碑データ利活用の研究"
   - name: "Alumni"
     members:
       - name: "鈴木 一郎"
         role: "2024 修了"

#publish
````

- `groups[]` を使うか、フラットに `members[]` だけ書くかは任意
- `photo` を指定しない場合、名前から自動生成された 2 文字のプレースホルダが入る

### `Publications` ページ — `code:publications.yaml`

````
Publications

code:publications.yaml
 publications:
   - year: 2024
     authors: "Yamada T., Sato H."
     title: "Foo Bar Baz: A Study"
     source: "Journal of X, Vol.10, No.2, pp.123-130"
     url: "https://doi.org/..."
     peerReviewed: true
     fullPaper: true
   - year: 2023.12
     authors: "Sato H., Yamada T."
     title: "Preliminary Investigation"
     source: "Proc. Conference Y"
     peerReviewed: false

#publish
````

- `year` は数値・文字列どちらも可 (`2024.06` のように月を含める書き方も OK)
- 描画時は年でグループ化、新しい順
- `All / Peer-reviewed / Full-paper` のクライアントサイドフィルタ付き

### 研究テーマ (各 1 ページずつ)

```
Research/水引アート支援

[* 概要]
水引細工の制作支援システム。イラストからのデザイン自動生成と
ノード操作による...

[* 担当]
佐藤花子 (D2)

#publish #research
```

`#research` タグが付くと自動的に `research-post.astro` で描画され、`/research` のカード一覧に表示されます。

### お知らせ (各 1 ページずつ)

```
News/2024-12 論文採択

NICOGRAPH 2024 にて...

#publish #news
```

`#news` が付くと `news-post.astro` で描画され、`/news` / Home の Recent news に並びます。

---

## 開発時のテンプレ振り分けルール (優先順位)

1. **`#research` タグ** → `research-post.astro` (タグ優先)
2. **`#news` タグ** → `news-post.astro`
3. **`.site` の `templates:` マッピング** (例: `"Members": members`)
4. **`#template/<name>` タグ** (`#template/members` 等)
5. **デフォルト `page` テンプレ** (`page.astro`)

タグベースの自動振り分け (1, 2) があるので、`Research/<name>` ページに `#template/research-post` を毎回書く必要はありません。

---

## 参考

- [docs/THEMES.md](../../docs/THEMES.md) — テーマ自作の汎用ガイド
- [`packages/theme-default/`](../theme-default) — 汎用テーマの参考実装
- [`packages/theme-utils/`](../theme-utils) — 共有ヘルパ
