# @cosense-site-kit/theme-organisation

企業・法人サイト向けテーマ。**Hero / Services / Cases / News / About / Contact** という、よくあるコーポレートサイト構成を Cosense の公開ページからそのまま組み立てます。

> 叩き台 (scaffold) として提供しています。視覚デザイン・テンプレ構成は実プロジェクトでカスタムする前提です。

---

## できること

| URL | テンプレ | データソース |
|---|---|---|
| `/` | `home.astro` | Hero + `Home` ページ本文 + Services + Cases + News |
| `/services` | `services-index.astro` | `#service` タグ付きページ (カードグリッド) |
| `/<service page>` | `service-post.astro` | 個別サービス紹介 |
| `/news` | `news-index.astro` | `#news` タグ付きページ (日付テーブル) |
| `/<news page>` | `news-post.astro` | 個別ニュース / プレスリリース |
| `/cases` | `case-index.astro` | `#case` タグ付きページ (カードグリッド) |
| `/<case page>` | `case-post.astro` | 個別事例ページ |
| `/tags/[tag]` | `tag.astro` | タグ別ページ一覧 |
| `/<page>` | `page.astro` | その他全ページ (デフォルト) |

固定 sticky ヘッダ + ダーク多カラムフッタ + 青系アクセントの素 CSS。

---

## astro.config.ts

```ts
import { defineConfig } from "astro/config";
import cosense from "@cosense-site-kit/astro";
import themeOrganisation from "@cosense-site-kit/theme-organisation";

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    themeOrganisation({
      heroHeadline: "テクノロジーで社会を支える",
      heroSubhead: "We deliver durable software for civic-scale problems.",
      heroCtaLabel: "サービス一覧",
      heroCtaHref: "/services",

      // タグカスタマイズ (既定: news, case, service)
      newsTag: "news",
      caseTag: "case",
      serviceTag: "service",

      // 多カラムフッタ (任意)
      footer: [
        {
          heading: "Company",
          items: [
            { label: "About", page: "About" },
            { label: "Recruit", page: "Recruit" },
            { label: "News", href: "/news" },
          ],
        },
        {
          heading: "Services",
          items: [
            { label: "サービス一覧", href: "/services" },
            { label: "導入事例", href: "/cases" },
          ],
        },
        {
          heading: "Legal",
          items: [
            { label: "Privacy", page: "Privacy" },
            { label: "Terms", page: "Terms" },
          ],
        },
      ],

      copyrightHolder: "Acme Inc.",
    }),
  ],
});
```

---

## Cosense 側のページ構成

### `.site` (必須)

```yaml
site:
  title: "Acme Inc."
  description: "持続可能なソフトウェアで社会課題を解決する"
  baseUrl: "https://acme.example"
  lang: "ja"

home:
  page: "Home"

nav:
  - { label: "Services", href: "/services" }
  - { label: "Cases",    href: "/cases" }
  - { label: "News",     href: "/news" }
  - { label: "About",    page: "About" }
  - { label: "Recruit",  page: "Recruit" }
  - { label: "Contact",  page: "Contact" }

posts:
  tag: "news"
  limit: 10
```

### サービス (各 1 ページずつ)

```
Service/Web Development

[* 概要]
TypeScript + Astro による高耐久 Web サイト開発。
Cosense / Notion を CMS として扱う...

[* 価格]
プロジェクト規模に応じて...

#publish #service
```

`#service` タグ付きで自動的に `service-post.astro` で描画され、`/services` カード一覧と Home に出ます。

### 事例 (各 1 ページずつ)

```
Case/愛知工業大学 公式サイト

[* 課題]
研究室サイトの更新が止まっていた...

[* 提案・実装]
cosense-site-kit を用いて Cosense ページから...

#publish #case
```

`#case` で `case-post.astro` 振り分け + `/cases` カード一覧。

### ニュース・プレスリリース

```
News/2024-12 新機能リリース

新サービス "Foo" をリリースしました...

#publish #news
```

### 静的ページ (About / Recruit / Contact / Privacy / Terms)

通常の Cosense ページに `#publish` を付けるだけ。`page.astro` (デフォルト) で描画。

---

## 開発時のテンプレ振り分けルール (優先順位)

1. **`#news` タグ** → `news-post.astro`
2. **`#case` タグ** → `case-post.astro`
3. **`#service` タグ** → `service-post.astro`
4. **`.site` の `templates:` マッピング**
5. **`#template/<name>` タグ**
6. **デフォルト `page` テンプレ**

タグベース自動振り分けが主軸なので、Cosense 作者は `#publish #news` などの 2 タグを付けるだけ。

---

## カスタマイズ余地 (叩き台からの拡張)

このテーマは**叩き台**として最小限の構成です。実プロジェクトでフォークするときの典型的な拡張:

- **会社情報セクション** — `Company` ページ + 専用テンプレ (会社概要表、地図埋め込み)
- **採用ページ** — `code:positions.yaml` で求人を構造化
- **問い合わせフォーム** — Astro server endpoint や外部フォームサービス連携
- **OGP 画像生成** — Astro の OG image generator integration
- **多言語対応** — `astro-i18n` 等

---

## 参考

- [docs/THEMES.md](../../docs/THEMES.md) — テーマ自作の汎用ガイド
- [`packages/theme-utils/`](../theme-utils) — 共有ヘルパ
