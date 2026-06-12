import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pc from "picocolors";

export interface InitOptions {
  cwd: string;
  project?: string;
  force?: boolean;
}

const TEMPLATE = (project: string) => `import { defineCosenseSite } from "@cosense-site-kit/core";

export default defineCosenseSite({
  site: {
    title: "My Cosense Site",
    description: "Built with cosense-site-kit",
    baseUrl: "https://example.com",
    lang: "ja",
  },

  source: {
    type: "cosense",
    project: ${JSON.stringify(project)},
  },

  publish: {
    default: "none",
    includeTags: ["publish"],
    excludeTags: ["draft", "private", "internal"],
  },

  routing: {
    slug: "metadata-or-encoded-title",
  },

  deploy: {
    target: "cloudflare-workers",
    schedule: "17 1,13 * * *",
  },
});
`;

export async function runInit(opts: InitOptions): Promise<void> {
  const target = resolve(opts.cwd, "cosense.config.ts");
  if (!opts.force) {
    try {
      await access(target);
      throw new Error(`${target} already exists. Re-run with --force to overwrite.`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  const project = opts.project ?? "your-public-cosense-project";
  await writeFile(target, TEMPLATE(project));
  console.log(pc.green("✓ created"), target);
  console.log();
  console.log("Next:");
  console.log(`  1. Edit ${pc.cyan("cosense.config.ts")} (set baseUrl, project, etc.)`);
  console.log(`  2. Run ${pc.cyan("cosense-site fetch")} to pull pages`);
  console.log(`  3. Run ${pc.cyan("npm run dev")} (Astro)`);
}
