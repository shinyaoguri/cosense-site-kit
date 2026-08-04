#!/usr/bin/env bash
# PR タイトルの Conventional Commits lint。squash merge ではタイトルが
# そのまま main のコミットメッセージになるため、マージ前に形式を強制する。
# 環境変数 PR_TITLE を検査する。
set -euo pipefail

title="${PR_TITLE:?PR_TITLE が未設定}"
re='^(feat|fix|docs|refactor|test|chore|ci|perf|build)(\([a-z0-9,/-]+\))?!?: .+'

if [[ "$title" =~ $re ]]; then
  echo "OK: pr-title「${title}」"
else
  echo "NG: PR タイトル「${title}」が Conventional Commits 形式でない (<type>(<scope>): <要約>、type は feat/fix/docs/refactor/test/chore/ci/perf/build)" >&2
  exit 1
fi
