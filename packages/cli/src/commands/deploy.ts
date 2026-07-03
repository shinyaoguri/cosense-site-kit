import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DEPLOY_TARGETS, type DeployTarget, loadCosenseSiteConfig } from "@cosense-site-kit/core";
import pc from "picocolors";
import { generateGithubActionsWorkflow } from "../generators/github-actions";
import { generateWranglerJsonc } from "../generators/wrangler";

export interface DeployInitOptions {
  cwd: string;
  configFile?: string;
  target?: DeployTarget;
  schedule?: string;
  force?: boolean;
  /** Include the pre-publish `cosense-site doctor` gate in the workflow. Default: true. */
  doctor?: boolean;
  /**
   * Write the workflow to `<repoRoot>/.github/workflows/` with steps scoped
   * to this subdirectory. Useful when the site lives under e.g. /site in a
   * monorepo. The path is relative to repoRoot.
   */
  workingDirectory?: string;
  /**
   * Build the framework from source and call the CLI via its local dist entry.
   * Internal: only for this repo's own dogfooding site. npm consumers must not
   * set it (the generated workflow would reference paths that don't exist).
   */
  frameworkDev?: boolean;
  /** Override repoRoot. Default: opts.cwd. */
  repoRoot?: string;
}

// Writes the CI workflow and (for cloudflare-workers) a wrangler.jsonc into
// the user's project. Target / schedule come from cosense.config.ts unless
// overridden by flags.
export async function runDeployInit(opts: DeployInitOptions): Promise<void> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  const target = opts.target ?? config.deploy?.target ?? "cloudflare-workers";
  // Defense in depth behind the CLI's --target choices: a target passed
  // programmatically (or an unexpected config value) must fail loudly here
  // rather than silently writing a workflow that's incomplete for either target.
  if (!(DEPLOY_TARGETS as readonly string[]).includes(target)) {
    throw new Error(
      `Invalid deploy target "${target}". Valid targets: ${DEPLOY_TARGETS.join(", ")}.`,
    );
  }
  const schedule = opts.schedule ?? config.deploy?.schedule;
  const repoRoot = opts.repoRoot ?? opts.cwd;

  const workflow = generateGithubActionsWorkflow({
    target,
    schedule,
    workingDirectory: opts.workingDirectory,
    doctor: opts.doctor,
    frameworkDev: opts.frameworkDev,
  });
  const workflowPath = resolve(repoRoot, ".github/workflows/build.yml");
  await writeIfAbsent(workflowPath, workflow, opts.force);
  console.log(pc.green("✓ wrote"), workflowPath);

  if (target === "cloudflare-workers") {
    const wrangler = generateWranglerJsonc({
      name: workerName(config.site.title, config.source.project),
    });
    const wranglerPath = resolve(opts.cwd, "wrangler.jsonc");
    await writeIfAbsent(wranglerPath, wrangler, opts.force);
    console.log(pc.green("✓ wrote"), wranglerPath);
  }
}

async function writeIfAbsent(path: string, content: string, force?: boolean): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (!force) {
    try {
      await access(path);
      throw new Error(`${path} already exists. Re-run with --force to overwrite.`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  await writeFile(path, content);
}

// Workers names must be 1–63 chars of [a-z0-9-]; a fully non-ASCII site title
// (common for Japanese sites) sanitizes to "", which wrangler rejects at
// deploy time. Fall back to the Cosense project name (already an ASCII slug),
// then to a fixed default. Exported for tests.
export function workerName(siteTitle: string, project: string): string {
  return sanitize(siteTitle) || sanitize(project) || "cosense-site";
}

function sanitize(s: string): string {
  const cut = s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);
  // Trim leading/trailing hyphens by index — AFTER the 63-char cut, so a hyphen
  // landing on the boundary doesn't survive (wrangler rejects a trailing "-").
  // Index trim also avoids the `/^-+|-+$/` anchored regex CodeQL flags.
  let start = 0;
  let end = cut.length;
  while (start < end && cut[start] === "-") start++;
  while (end > start && cut[end - 1] === "-") end--;
  return cut.slice(start, end);
}
