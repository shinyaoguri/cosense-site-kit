# 0004. リリースは changesets + npm trusted publishing (OIDC) に任せる

## 状態

採用

## 文脈

5 パッケージが相互に依存しており、手で `npm publish` を叩くと (1) バージョンの上げ漏れ、
(2) パッケージ間の依存レンジの取り残し、(3) CHANGELOG の書き忘れ、が確実に起きる。

また npm の長期トークンを GitHub Secrets に置く方式は、漏洩したときに公開パッケージへ
直接コードを流し込める。無人運用（cron ビルド）を前提にする以上、置かずに済むなら置きたくない。

## 決定

- リリースは [changesets](https://github.com/changesets/changesets) が駆動する。開発者は変更と同じ
  PR に `.changeset/*.md` を 1 つ足すだけ
- `release.yml` が main への push で changesets/action を実行し、changeset があれば
  「chore: version packages」PR を開く／更新、無ければ `npm run release`（= `build && changeset publish`）
- 認証は **npm trusted publishing (OIDC)**。`NODE_AUTH_TOKEN` は使わず `id-token: write` で都度取得する
- changesets/action は SHA で pin する（publish 権限を持つジョブが可動タグを引かないため）。
  **action の major と `@changesets/cli` の major は同時にしか動かせない**（action v2 は CLI v3 を要求し、
  v2 のままなら action v1 を使えと言って落ちる）。action v2 は入力名も全面改名しているため、
  SHA だけの bump は「未知入力は警告のみ」で黙って無効化される
- `.changeset/config.json` の `updateInternalDependencies: "patch"` でパッケージ間レンジを自動更新
- **pre-1.0 では新機能でも patch bump を基本にする**。0.x の caret（`^0.2.x`）は `0.3.0` を拾わないため、
  minor を上げると消費側へ自動で届かない

## 影響

- npm の長期トークンがリポジトリに存在しない。publish 経路は `shinyaoguri/cosense-site-kit` の
  `release.yml` に紐づく（npmjs.com 側で trusted publisher 設定済みであることが前提）。
- changeset は自動では付かない。忘れると main にはマージできるが**公開されない**。これを機械的に
  拾うため `.githooks/pre-push` で「`packages/*/src` を触ったのに changeset が無い push」を止めている
  （逃げ道は `--no-verify`）。
- バージョン番号の意味が semver の一般的な期待からずれる（新機能が patch で出る）。1.0 到達時に
  この方針は見直す。
- `ci.yml` は `release.yml` を実行しないので、リリース経路の破損は CI では緑のまま通る。
  action の major / CLI の major / `release.yml` の入力名 / `.changeset/config.json` の `$schema` の
  整合は [`test/dependency-consistency.test.ts`](../../test/dependency-consistency.test.ts) が
  ユニットテストとして担保する（dependabot の SHA bump 単独では赤くなる）。
