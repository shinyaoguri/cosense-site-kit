# site/

公式ドキュメントサイト。cosense-site-kit 自身を使って、Cosense プロジェクト [`cosense-site-kit`](https://scrapbox.io/cosense-site-kit/) をデータソースに静的サイトを生成し、GitHub Pages に公開します。

公開URL: <https://shinyaoguri.github.io/cosense-site-kit/>

## ローカル開発

ローカルでビルドを試すには、サイトのワークスペース内で:

```bash
npm install                            # リポジトリのルートで一度だけ
cd site
npx cosense-site doctor                # Cosense プロジェクトの状態を診断
npm run fetch                          # ページ取得 → .cosense-cache/intermediate.json
npm run dev                            # http://localhost:4321/cosense-site-kit/
```

サイトはサブパス `/cosense-site-kit` 配下で配信されるため、開発時のURLも `localhost:4321/cosense-site-kit/` になります。

## デプロイ

`.github/workflows/build.yml`（リポジトリのルートに生成済み）が:

1. cron（1日2回）または手動 dispatch で起動
2. `cosense-site fetch` で Cosense からページを取得
3. `astro build` で `site/dist/` を生成
4. `actions/upload-pages-artifact` → `actions/deploy-pages@v4` で GitHub Pages に公開

リポジトリの **Settings → Pages → Source** を **"GitHub Actions"** に設定すれば、初回 push 以降は cron が自動で更新します。
