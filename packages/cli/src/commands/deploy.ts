import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  generateGithubActionsWorkflow,
  generateWranglerJsonc,
} from "@cosense-site-kit/deploy";
import { loadCosenseSiteConfig } from "@cosense-site-kit/core";
import pc from "picocolors";

export interface DeployInitOptions {
  cwd: string;
  configFile?: string;
  target?: "cloudflare-workers" | "github-pages";
  schedule?: string;
  force?: boolean;
  /**
   * Write the workflow to `<repoRoot>/.github/workflows/` with steps scoped
   * to this subdirectory. Useful when the site lives under e.g. /site in a
   * monorepo. The path is relative to repoRoot.
   */
  workingDirectory?: string;
  /** Override repoRoot. Default: opts.cwd. */
  repoRoot?: string;
}

// Writes the CI workflow and (for cloudflare-workers) a wrangler.jsonc into
// the user's project. Target / schedule come from cosense.config.ts unless
// overridden by flags.
export async function runDeployInit(opts: DeployInitOptions): Promise<void> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  const target = opts.target ?? config.deploy?.target ?? "cloudflare-workers";
  const schedule = opts.schedule ?? config.deploy?.schedule;
  const repoRoot = opts.repoRoot ?? opts.cwd;

  const workflow = generateGithubActionsWorkflow({
    target,
    schedule,
    workingDirectory: opts.workingDirectory,
  });
  const workflowPath = resolve(repoRoot, ".github/workflows/build.yml");
  await writeIfAbsent(workflowPath, workflow, opts.force);
  console.log(pc.green("✓ wrote"), workflowPath);

  if (target === "cloudflare-workers") {
    const projectName = sanitize(config.site.title);
    const wrangler = generateWranglerJsonc({ name: projectName });
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

function sanitize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}
