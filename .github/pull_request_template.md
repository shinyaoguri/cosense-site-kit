<!--
タイトルは Conventional Commits で。squash merge でそのまま main のコミット要約になります。
  <type>(<scope>): <要約>   type: feat / fix / docs / refactor / test / chore / ci
本文もそのまま squash コミットの本文として履歴に残ります。
-->

## 目的

<!-- なぜこの変更が必要か。関連 Issue があれば Closes #123 -->

## 変更点

<!-- 何をどう変えたか。設計判断を伴うなら docs/decisions/ の ADR も添える -->

## 確認方法

<!-- レビュアーが再現できる手順。実行したコマンドと結果 -->

```
npm run build && npm test && npm run lint && npm run typecheck
```

## チェック

- [ ] 公開パッケージ（`core` / `astro` / `theme-utils` / `theme-default` / `cli`）の利用者に影響する変更なら `.changeset/*.md` を追加した
- [ ] バグ修正なら、先に失敗する再現テストを書いた
- [ ] 設計判断を伴うなら `docs/decisions/` に ADR を追加・更新した
