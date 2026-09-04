import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

// Repo-level guard against #157: biome resolves the paths handed to the CLI to
// absolute paths before matching them against `files.includes`, so a `**/`-
// prefixed exclusion also matches an *ancestor* of the project root. `**/.claude`
// therefore excluded the whole checkout whenever the repository sat under a
// `.claude` directory — which is exactly where Claude Code puts its worktrees
// (`.claude/worktrees/<name>`), so `npm run lint` silently checked 0 files there
// while CI (whose checkout path has no `.claude`) stayed green.
//
// This runs the real biome against the real biome.json from such a path, because
// the failure only exists in that path resolution; asserting on the config text
// would just restate whatever the config happens to say.

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const biomeBin = join(repoRoot, "node_modules", ".bin", "biome");

const tempRoots: string[] = [];

afterAll(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
});

/**
 * A throwaway checkout holding the repo's own biome.json, nested under the given
 * path segments. It is a git repository with an empty .gitignore because
 * `vcs.useIgnoreFile: true` makes biome refuse to run outside one.
 */
const checkoutAt = (...segments: string[]): string => {
  const root = mkdtempSync(join(tmpdir(), "cosense-lint-"));
  tempRoots.push(root);

  const checkout = join(root, ...segments);
  mkdirSync(checkout, { recursive: true });
  execFileSync("git", ["init", "-q", "."], { cwd: checkout });
  writeFileSync(join(checkout, ".gitignore"), "");
  copyFileSync(join(repoRoot, "biome.json"), join(checkout, "biome.json"));
  writeFileSync(join(checkout, "sample.ts"), "export const sample = 1;\n");

  return checkout;
};

const checkedFileCount = (cwd: string): number => {
  const { stdout, stderr } = spawnSync(biomeBin, ["check", "."], { cwd, encoding: "utf8" });
  const output = `${stdout}${stderr}`;

  const checked = /Checked (\d+) files?/.exec(output);
  if (!checked) throw new Error(`biome did not report a file count:\n${output}`);
  return Number(checked[1]);
};

describe("biome.json vs the path the repository is checked out to", () => {
  it.each([
    { label: "a plain checkout", segments: ["repo"] },
    // The default location of a Claude Code worktree.
    { label: "a checkout under .claude/worktrees", segments: [".claude", "worktrees", "probe"] },
  ])("checks files from $label", ({ segments }) => {
    expect(checkedFileCount(checkoutAt(...segments))).toBeGreaterThan(0);
  });

  it("still excludes the repository's own .claude directory", () => {
    const checkout = checkoutAt("repo");
    mkdirSync(join(checkout, ".claude"));
    writeFileSync(join(checkout, ".claude", "settings.json"), '{"x":1}\n');

    const { stdout, stderr } = spawnSync(biomeBin, ["check", ".claude"], {
      cwd: checkout,
      encoding: "utf8",
    });
    expect(`${stdout}${stderr}`).toContain("No files were processed");
  });
});
