#!/usr/bin/env bash
# リリース PR の滞留検知 (#143)。changesets が開く "chore: version packages" PR は
# 人がマージするまで npm へ公開されず、利用側には旧版しか見えないので原因に
# 気付けない (#140)。PR が THRESHOLD_DAYS 日以上 open ならリマインダ Issue を
# 1 件だけ開き、マージされる (または作り直されて新しくなる) と閉じる。
# リリース PR は作り直されず更新され続けるので、作成からの日数は「未リリースの
# changeset が最初に入ってからの日数」とほぼ同じになる。
# release-reminder.yml から毎日呼ばれる。gh は GH_TOKEN で認証済みの前提。
set -euo pipefail

threshold="${THRESHOLD_DAYS:-3}"
now="${NOW:-$(date +%s)}"
label="release-reminder"

pr=$(gh pr list --head changeset-release/main --state open --limit 1 \
  --json number,createdAt,url \
  --jq '.[0] // empty | "\(.number) \(.createdAt | fromdateiso8601) \(.url)"')
issue=$(gh issue list --label "$label" --state open --limit 1 --json number --jq '.[0].number // empty')

age_days=-1
if [ -n "$pr" ]; then
  read -r number created url <<<"$pr"
  age_days=$(((now - created) / 86400))
fi

if [ "$age_days" -ge "$threshold" ]; then
  if [ -n "$issue" ]; then
    echo "リリース PR #$number は $age_days 日 open。リマインダ #$issue は開いたまま。"
    exit 0
  fi
  body="リリース PR $url が $age_days 日間マージされていません。

マージされるまで npm には公開されず、利用側には旧版しか見えません (#140 のように、main では直っているのに利用側がブロックされます)。内容を確認してマージしてください。マージすると Release ワークフローが npm へ公開します。

この Issue は \`release-reminder.yml\` が自動で開きました。リリース PR がマージされると、次の実行で自動的に閉じます。"
  gh label create "$label" --force --color FBCA04 --description "リリース PR の滞留を知らせる (release-reminder.yml)" >/dev/null
  assignee=()
  if [ -n "${GITHUB_REPOSITORY_OWNER:-}" ]; then assignee=(--assignee "$GITHUB_REPOSITORY_OWNER"); fi
  gh issue create --title "リリース PR #$number が $age_days 日間マージされていません" \
    --label "$label" "${assignee[@]}" --body "$body"
  echo "リリース PR #$number は $age_days 日 open。リマインダを開いた。"
elif [ -n "$issue" ]; then
  gh issue close "$issue" --comment "滞留していたリリース PR が無くなった (マージ済み、またはしきい値 $threshold 日未満の新しい PR のみ) ので閉じます。"
  echo "滞留が解消したのでリマインダ #$issue を閉じた。"
else
  echo "滞留なし。"
fi
