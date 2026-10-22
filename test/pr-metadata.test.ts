import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The PR metadata checks run in .github/workflows/pr-metadata.yml. Squash merge
// turns the PR title and body into main's commit message, so both are linted
// before merge; these tests drive the real scripts with the env CI passes.

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function run(script: string, env: Record<string, string>) {
  const result = spawnSync("bash", [join(repoRoot, "scripts", script)], {
    env: { PATH: process.env.PATH ?? "", ...env },
    encoding: "utf8",
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("check-pr-body.sh", () => {
  const check = (body: string) => run("check-pr-body.sh", { PR_BODY: body });

  it("rejects the upstream release note that skipped main's CI in #175", () => {
    const body = [
      "Bumps the minor-and-patch group with 5 updates:",
      "<details><summary>Commits</summary>",
      "<ul>",
      "<li>chore(release): 0.19.0 [ci skip]</li>",
      "</ul>",
      "</details>",
    ].join("\n");
    const { status, output } = check(body);
    expect(status).toBe(1);
    expect(output).toContain("[ci skip]");
  });

  it.each(["[Skip CI]", "[no ci]", "[skip actions]", "[actions skip]"])(
    "rejects the skip directive %s regardless of case",
    (directive) => {
      expect(check(`Some notes ${directive} here`).status).toBe(1);
    },
  );

  it("rejects a skip-checks trailer at the start of a line", () => {
    expect(check("Body\n\nskip-checks: true").status).toBe(1);
    expect(check("Body\n\nSkip-Checks:true").status).toBe(1);
  });

  it("accepts ordinary and empty bodies", () => {
    expect(check("## 目的\nfix the thing\n\nCloses #1").status).toBe(0);
    expect(check("").status).toBe(0);
    expect(run("check-pr-body.sh", {}).status).toBe(0);
  });

  it("accepts prose that mentions directives without their trigger form", () => {
    expect(check("dependabot の本文にある ci skip 指示を検出する").status).toBe(0);
    expect(check("トレーラ `skip-checks: true` を行頭に書くと効く").status).toBe(0);
  });
});

describe("check-pr-title.sh", () => {
  it("accepts a Conventional Commits title and rejects anything else", () => {
    expect(run("check-pr-title.sh", { PR_TITLE: "fix(core): 何かを直す" }).status).toBe(0);
    expect(run("check-pr-title.sh", { PR_TITLE: "Update deps" }).status).toBe(1);
  });
});
