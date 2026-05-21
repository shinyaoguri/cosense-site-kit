import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import pc from "picocolors";
import prompts from "prompts";
import { resolveTemplate, templates } from "./catalog";

export const VERSION = "0.0.0";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      template: { type: "string", short: "t" },
      yes: { type: "boolean", short: "y", default: false },
    },
  });

  let dir = positionals[0];
  let templateSpec = values.template;

  if (!values.yes) {
    const answers = (await prompts(
      [
        {
          type: dir ? null : "text",
          name: "dir",
          message: "Where should we create the site?",
          initial: "my-cosense-site",
        },
        {
          // Pick a template only when one wasn't named and there's a choice.
          type: templateSpec || templates.length < 2 ? null : "select",
          name: "template",
          message: "Template",
          choices: templates.map((t) => ({
            title: t.name,
            description: t.description,
            value: t.id,
          })),
        },
      ],
      { onCancel: () => process.exit(1) },
    )) as { dir?: string; template?: string };
    dir = dir ?? answers.dir;
    templateSpec = templateSpec ?? answers.template;
  }

  const targetDir = dir ?? "my-cosense-site";
  const tpl = resolveTemplate(templateSpec);
  const targetPath = resolve(process.cwd(), targetDir);

  await ensureEmpty(targetPath);
  cloneTemplate(tpl.repo, targetPath);
  // Drop the template's git history so the new site starts clean (degit-style).
  await rm(join(targetPath, ".git"), { recursive: true, force: true });

  console.log();
  console.log(pc.green("✓ created"), targetPath);
  console.log(pc.dim(`  from ${tpl.name} (${tpl.repo})`));
  console.log();
  console.log("Next:");
  console.log(pc.cyan(`  cd ${targetDir}`));
  console.log(pc.dim("  # edit cosense.config.ts — set source.project to your public Cosense"));
  console.log(pc.dim("  # project, plus site.title / site.baseUrl"));
  console.log(pc.cyan("  npm install"));
  console.log(pc.cyan("  npm run fetch"));
  console.log(pc.cyan("  npm run dev"));
}

// Fetch a template repo's latest tree (no history) via a shallow clone.
function cloneTemplate(repo: string, dir: string): void {
  const url = `https://github.com/${repo}.git`;
  try {
    execFileSync("git", ["clone", "--depth", "1", "--single-branch", url, dir], {
      stdio: ["ignore", "ignore", "inherit"],
    });
  } catch {
    throw new Error(`Failed to clone ${url}. Is git installed and the repository public?`);
  }
}

async function ensureEmpty(path: string): Promise<void> {
  try {
    const entries = await readdir(path);
    if (entries.length > 0) {
      throw new Error(`Target directory ${path} is not empty.`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(path, { recursive: true });
      return;
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red("✗"), msg);
  process.exit(1);
});
