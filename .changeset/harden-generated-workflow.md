---
"@cosense-site-kit/cli": patch
---

`deploy init` が生成するワークフローのサプライチェーン面を強化しました。`--force` で再生成すると、次の 3 点が取り込まれます。

- Cloudflare 向けは build と deploy を別ジョブに分けました。依存をインストールするジョブに `CLOUDFLARE_API_TOKEN` を渡さず、deploy ジョブは checkout も依存インストールもしないまま `npx wrangler@4 deploy` を実行します。`cloudflare/wrangler-action` は使わなくなりました。
- install は `package-lock.json` があれば `npm ci`、無ければ `npm install` を実行します。
- checkout は `persist-credentials: false` にしました。
