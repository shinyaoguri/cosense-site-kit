# 初期ページ: 中身

[`https://scrapbox.io/cosense-site-kit/`](https://scrapbox.io/cosense-site-kit/) に下記のページを作って、各ボディをそのまま貼り付けてください。ページタイトルは見出しの文字列をそのまま使います。`#publish` がスイッチです。

> **注意 1**: Cosense はページ本文の `#word` をどこに書いても hashtag として扱います。説明文中で `#draft` のようなタグ名に言及する場合は **必ず `` `#draft` `` のようにバッククォートで囲む**こと。さもないとそのページに本物の `#draft` タグが付き、公開ルールから外れます。
>
> **注意 2**: Cosense の `code:foo.txt` ブロック内に **完全な空行** を入れると、そこで code ブロックが終了します。空行を見た目残したいときは「半角スペース1個だけの行」にしてください。下の本文はすべて空行を入れない形に整えてあります。

---

## `Home`

```
cosense-site-kit は、Cosense（旧 Scrapbox）の公開プロジェクトをそのまま静的サイトにする小さな SSG フレームワークです。Cosense で書き、GitHub Actions の cron がビルドして、Cloudflare Workers Static Assets または GitHub Pages に配信します。

[* できること]
 Cosense を CMS として使える。`#publish` を付けたページだけが公開対象になる
 Cosense 上の [.site page] で nav・home・ブログ・featured を YAML で宣言できる
 Cosense API への依存は core に隔離されている（詳細は [Architecture]）
 [Doctor] が、リンク切れ・公開漏れ・redirect 切れを公開前に検出する

[* 始める]
 [Quick start] にインストールから初回ビルドまでの手順があります。

[* デプロイ]
 [Deploy] に GitHub Pages / Cloudflare Workers それぞれの手順があります。

[* リポジトリ]
 [https://github.com/shinyaoguri/cosense-site-kit GitHub]

#publish
```

---

## `Quick start`

```
cosense-site-kit でサイトを立ち上げる最短手順。

[** 1. 雛形を生成]
code:install.sh
 npm create cosense-site my-site \
   --title "My Site" \
   --url "https://example.com" \
   --project "your-public-cosense-project" \
   --yes

`--project` は自分の公開 Cosense プロジェクト名です。

[** 2. ローカルで起動]
code:dev.sh
 cd my-site
 npm install
 npm run fetch
 npm run dev

ブラウザで http://localhost:4321/ が開きます。

[** 3. ページを公開する]
Cosense 側で、公開したいページに `#publish` を付けます。最下行にタグだけの行を置くのが推奨です。

[** 次に読む]
 サイト構造を宣言する [.site page]
 ビルド前の点検 [Doctor]
 デプロイ [Deploy]

#publish
```

---

## `Architecture`

```
cosense-site-kit は「Cosense API を内部 API として扱う」前提で設計されています。Cosense は仕様変更があり得るため、依存範囲を core に閉じ込め、テーマや Astro 層は安定した中間データモデルだけを参照します。

[** データの流れ]
code:flow.txt
 Cosense public project
    │
    │  list + 差分 fetch（cache: .cosense-cache/）
    ▼
 @cosense-site-kit/core
    • fetch / parse / normalize / validate
    • publish フィルタ
    • slug + 内部リンク解決 + backlinks
    • .site の site.yaml を SiteStructure にパース
    │
    ▼
 バージョン付き中間 JSON   ← 公開コントラクト（schemaVersion: "1"）
    │
    ▼
 @cosense-site-kit/astro      (Content Loader + Integration)
    │
    ▼
 @cosense-site-kit/theme-*    (Astro Integration がルートを inject)
    │
    ▼
 静的サイト → CDN (Cloudflare Workers Static Assets / GitHub Pages)

[** 設計の核となるルール]
 Cosense API の知識は core/src/source/cosense/ と core/src/parse/scrapbox.ts だけに置く
 テーマ・Astro・CLI は中間モデルしか触らない
 中間モデルは schemaVersion: "1" を持ち、将来の v2 と共存できる構造になっている

[** 関連]
 サイト構造の宣言は [.site page]
 公開前の点検は [Doctor]

#publish
```

---

## `.site page`

```
サイト全体の構造（nav・home・ブログフィード・featured・redirects）は Cosense 上の `.site` というタイトルのページで宣言します。フレームワークはそのページ内の `code:site.yaml` ブロックを読み、YAML として解釈します。

[** 書き方]
タイトル `.site` のページを作り、`code:site.yaml` ブロックを1つ置きます。前後には自由にメモを書いても構いません。

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

 redirects:
   old-slug: new-slug

 templates:
   "About Me": profile

[** フィールド]
 home.page  ホームに本文として表示する Cosense ページ
 nav[]      ヘッダーの項目。{label, page} で内部、{label, href} で外部 URL
 posts.tag  このタグが付いているページが /posts に出る
 posts.limit ホームの「Recent posts」の件数上限
 featured[] ホームで目立たせるページのタイトル
 redirects  旧 slug → 新 slug の写像
 templates  ページタイトル → テンプレート名 のマッピング（[Templates] 参照）

[** 注意]
 `.site` 自身には `#publish` を付けない。フレームワークが構造ページとして特別扱いします
 未知のフィールドは zod の passthrough で保持されるので、独自セクションを足しても core の変更なしで使えます

[** 関連]
 個別ページの書き方は [Quick start]
 検証は [Doctor]

#publish
```

---

## `Doctor`

```
`cosense-site doctor` は、ビルド前に「うまく動かなさそうなところ」を1コマンドで洗い出します。CI のゲートにそのまま使えます。

[** 実行]
code:doctor.sh
 npx cosense-site doctor

[** 出力例]
code:doctor.txt
 Doctor report for "cosense-site-kit"

   ✓ Pipeline warnings  none
   ✓ Publish rules produce pages  23 kept, 5 excluded
   ✓ Site-config page  ".site" parsed successfully
   ✗ Nav references resolve  1 nav reference(s) point to missing pages
       · "Contact" is not a published page
   ⚠ Internal page links resolve  4 broken page link target(s)
       · "Old Topic" referenced by 2 page(s)
   ✓ No slug collisions  all slugs unique
   ✓ No draft leak  no excluded-tag pages published

   Summary: 6 ok, 1 warn, 1 fail

fail が1つでもあれば exit code 1。CI で `cosense-site doctor && astro build` のようにすれば公開前ゲートになります。

[** チェック項目]
 Pipeline warnings: site.yaml の警告
 Publish rules produce pages: 公開対象が 0 件でないか
 Site-config page: [.site page] が認識できているか
 Nav references resolve: nav が指すページが公開されているか
 Home reference resolves: home.page が公開されているか
 Featured references resolve: featured 内のページが公開されているか
 Posts tag has content: posts.tag が付いたページが存在するか
 Redirect destinations exist: redirect 先が公開ページか
 Internal page links resolve: 内部リンクの飛び先が存在するか
 No slug collisions: slug 重複が無いか
 No draft leak: `#draft` 付きページが誤って公開されていないか

#publish
```

---

## `Deploy`

```
cosense-site-kit は GitHub Pages と Cloudflare Workers Static Assets の両方に対応します。どちらも GitHub Actions の cron でビルドして配信する前提です。

[** 共通: ワークフローを生成]
code:deploy.sh
 npx cosense-site deploy init

cosense.config.ts の deploy.target に従い、.github/workflows/build.yml が生成されます。

[** GitHub Pages]
リポジトリの Settings → Pages → Source を GitHub Actions に切り替えます。それだけ。

サブパス（<user>.github.io/<repo>/）に配信する場合は site.base を設定します:
code:cosense.config.ts
 site: {
   baseUrl: "https://shinyaoguri.github.io",
   base: "/cosense-site-kit",
 }

[** Cloudflare Workers Static Assets]
リポジトリ Secrets に2つ追加:
 CLOUDFLARE_API_TOKEN
 CLOUDFLARE_ACCOUNT_ID

ワークフロー生成時に wrangler.jsonc も出力されます。

[** スケジュール]
デフォルトは `cron: "17 1,13 * * *"`（1日2回、毎時00分を避けたタイミング）。Cosense は分単位で更新する性質ではないので、これで十分です。

[** キャッシュ]
actions/cache@v4 で .cosense-cache/ を CI 実行間に永続化します。差分 fetch のおかげで、2 回目以降のビルドは Cosense への負荷も時間もごく小さくなります。

[** 関連]
 まずは [Quick start]
 デプロイ前に [Doctor]

#publish
```

---

## `Templates`

```
WordPress のテンプレート階層と同じ発想で、ページごとに違う見た目に切り替えられます。URL は /<slug> のまま変わらず、テーマが内部のレンダリングだけ替えます。

[** 仕組み]
 1. 中間モデルが各ページに template: string を解決する（詳細は [Architecture]）
 2. テーマの _dispatcher.astro が template 名から .astro コンポーネントへ振り分ける
 3. URL は変わらない、中の構造だけ変わる

[** 指定方法（優先度順）]
 1. ページ本文の `#template/<name>` タグ
 2. [.site page] の YAML の `templates:` マッピング
 3. デフォルトは `page`

[** theme-default の提供テンプレート]
 page    通常ページ（デフォルト）。タイトル + タグチップ + 本文 + backlinks
 profile プロフィール系。中央ヒーロー + 本文。タグチップなし

[** 例1: ページに直接付ける]
ページ本文末尾にこのように書きます（空行は入れない；Cosense は空行で code ブロックが終わる）:
code:about-me.txt
 About Me
 私についての説明...
 #publish #template/profile

[** 例2: .site で一括宣言]
code:site.yaml
 templates:
   "About Me":  profile
   "Members":   members
   "Welcome":   landing

[** 自作テンプレート]
テーマを自作 / fork する場合は templates/ に .astro を1ファイル足して _dispatcher.astro の TEMPLATES に登録するだけ。未知のテンプレート名は自動で page にフォールバックします。

[** 検証]
[Doctor] が Template usage と Template mapping titles の2つで検証します。

#publish
```

---

## 順序の目安

1. `.site` ページを作る（YAML だけ、#publish なし）
2. `Home` を作る
3. `Quick start` `Architecture` `.site page` `Doctor` `Deploy` `Templates` を作る（順不同）
4. `cd site && npx cosense-site doctor` で全部 ✓ になることを確認
5. push して GitHub Pages にデプロイ
