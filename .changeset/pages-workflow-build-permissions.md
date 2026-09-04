---
"@cosense-site-kit/cli": patch
---

`deploy init --target github-pages` が生成する workflow の build ジョブに `pages: read` を付与。`actions/configure-pages` は build ジョブで `GET /repos/{owner}/{repo}/pages` を叩くため、`contents: read` だけだと `Resource not accessible by integration` で 403 になり、build が落ちて deploy が skip される環境があった。書き込み権限と OIDC トークンは deploy ジョブのままなので最小権限は保たれる。

既に生成済みの workflow には届かないので、踏んでいるサイトは `cosense-site deploy init --target github-pages --force` で再生成するか、build ジョブの `permissions:` に `pages: read` を 1 行足す。
