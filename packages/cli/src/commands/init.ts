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
    // On GitHub Pages, the deploy workflow injects the right origin and subpath
    // (PAGES_ORIGIN / PAGES_BASE_PATH from actions/configure-pages), so the site
    // works at any URL — user page ("/") or project page ("/REPO") — with no
    // edits. Change the fallbacks for local builds or other hosts (Cloudflare
    // serves at the root, so "/" is correct there).
    baseUrl: process.env.PAGES_ORIGIN || "https://example.com",
    base: process.env.PAGES_BASE_PATH || "/",
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
  console.log(`  1. Edit ${pc.cyan("cosense.config.ts")} (set source.project, title)`);
  console.log(`  2. Run ${pc.cyan("cosense-site fetch")} to pull pages`);
  console.log(`  3. Run ${pc.cyan("npm run dev")} (Astro)`);
}
