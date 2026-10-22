import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// .github/workflows/release-reminder.yml runs this script daily. It opens one
// reminder issue when the changesets release PR has sat unmerged for
// THRESHOLD_DAYS (#143), and closes it once the PR is merged or replaced.
// A fake `gh` on PATH serves canned JSON — through the real jq when `--jq` is
// passed, so the script's jq expressions are exercised too — and logs every call.

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(repoRoot, "scripts", "check-stale-release-pr.sh");

const FAKE_GH = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_LOG"
case "$1 $2" in
  "pr list") data="$FAKE_PRS" ;;
  "issue list") data="$FAKE_ISSUES" ;;
  *) exit 0 ;;
esac
jq_expr=""
while [ $# -gt 0 ]; do
  if [ "$1" = "--jq" ]; then jq_expr="$2"; shift; fi
  shift
done
if [ -n "$jq_expr" ]; then printf '%s' "$data" | jq -r "$jq_expr"; else printf '%s' "$data"; fi
`;

const NOW = Date.parse("2026-10-23T00:00:00Z") / 1000;
const DAY = 86400;
const iso = (epoch: number) => new Date(epoch * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
const releasePr = (ageDays: number) => [
  {
    number: 200,
    createdAt: iso(NOW - ageDays * DAY),
    url: "https://github.com/o/r/pull/200",
  },
];

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "release-reminder-"));
  writeFileSync(join(dir, "gh"), FAKE_GH);
  chmodSync(join(dir, "gh"), 0o755);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run(prs: unknown[], issues: unknown[]) {
  const log = join(dir, "gh.log");
  writeFileSync(log, "");
  const result = spawnSync("bash", [script], {
    env: {
      PATH: `${dir}:${process.env.PATH ?? ""}`,
      GH_LOG: log,
      FAKE_PRS: JSON.stringify(prs),
      FAKE_ISSUES: JSON.stringify(issues),
      NOW: String(NOW),
      GITHUB_REPOSITORY_OWNER: "owner",
    },
    encoding: "utf8",
  });
  const calls = readFileSync(log, "utf8").split("\n").filter(Boolean);
  const writes = calls.filter((c) => !/^(pr|issue) list /.test(c));
  return { status: result.status, output: result.stdout + result.stderr, writes };
}

describe("check-stale-release-pr.sh", () => {
  it("opens a reminder when the release PR has been open past the threshold", () => {
    const { status, writes } = run(releasePr(4), []);
    expect(status).toBe(0);
    const create = writes.find((c) => c.startsWith("issue create"));
    expect(create).toBeDefined();
    expect(create).toContain("#200");
    expect(create).toContain("4 日間");
    expect(create).toContain("--label release-reminder");
    expect(create).toContain("--assignee owner");
    expect(create).toContain("https://github.com/o/r/pull/200");
  });

  it("treats exactly the threshold as stale", () => {
    expect(run(releasePr(3), []).writes.some((c) => c.startsWith("issue create"))).toBe(true);
  });

  it("does nothing while a reminder is already open for a stale PR", () => {
    expect(run(releasePr(10), [{ number: 7 }]).writes).toEqual([]);
  });

  it("closes the reminder once the release PR is fresh again or gone", () => {
    for (const prs of [releasePr(2), []]) {
      const { status, writes } = run(prs, [{ number: 7 }]);
      expect(status).toBe(0);
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatch(/^issue close 7 /);
    }
  });

  it("writes nothing when there is no stale PR and no reminder", () => {
    expect(run(releasePr(2), []).writes).toEqual([]);
    expect(run([], []).writes).toEqual([]);
  });
});
