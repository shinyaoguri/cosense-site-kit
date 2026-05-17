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
}

// Writes the CI workflow and (for cloudflare-workers) a wrangler.jsonc into
// the user's project. Target / schedule come from cosense.config.ts unless
// overridden by flags.
export async function runDeployInit(opts: DeployInitOptions): Promise<void> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  const target = opts.target ?? config.deploy?.target ?? "cloudflare-workers";
  const schedule = opts.schedule ?? config.deploy?.schedule;

  const workflow = generateGithubActionsWorkflow({ target, schedule });
  const workflowPath = resolve(opts.cwd, ".github/workflows/build.yml");
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
