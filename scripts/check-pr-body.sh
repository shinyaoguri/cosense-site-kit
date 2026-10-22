#!/usr/bin/env bash
# PR 本文のスキップ指示検出。squash merge ではリポ設定 (PR_BODY) により本文が
# そのまま main のコミットメッセージになる。本文に [ci skip] などが混ざると、
# GitHub がその push の workflow をまとめてスキップし、main の CI も Release も
# 走らない (#181: dependabot PR に転記された上流のコミット一覧が原因だった)。
# 環境変数 PR_BODY を検査する (未設定・空は OK — 本文の無い PR もある)。
set -euo pipefail

body="${PR_BODY:-}"
# GitHub が解釈する指示: 括弧付きの 5 種と、行頭のトレーラ skip-checks: true。
directives='\[(skip ci|ci skip|no ci|skip actions|actions skip)\]|^[[:space:]]*skip-checks:[[:space:]]*true'

if hits=$(printf '%s\n' "$body" | grep -inE "$directives"); then
  echo "NG: PR 本文に workflow のスキップ指示がある。squash merge でコミットメッセージに入ると main の CI・Release が走らない:" >&2
  printf '%s\n' "$hits" | sed 's/^/  /' >&2
  echo "本文から該当箇所を消すか、括弧を外すなどして無害化して保存すれば再検査される" >&2
  exit 1
fi
echo "OK: pr-body にスキップ指示なし"
