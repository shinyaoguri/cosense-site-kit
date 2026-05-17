import { cp, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import pc from "picocolors";

export const VERSION = "0.0.0";

interface Answers {
  targetDir: string;
  projectName: string;
  siteTitle: string;
  baseUrl: string;
  cosenseProject: string;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      title: { type: "string" },
      url: { type: "string" },
      project: { type: "string" },
      yes: { type: "boolean", short: "y", default: false },
    },
  });

  const argDir = positionals[0];

  const fromFlags = {
    targetDir: argDir,
    siteTitle: values.title,
    baseUrl: values.url,
    cosenseProject: values.project,
  };

  const answers = values.yes ? fromFlags : await ask(fromFlags);

  const final: Answers = {
    targetDir: answers.targetDir ?? "my-cosense-site",
    projectName: "",
    siteTitle: answers.siteTitle ?? "My Cosense Site",
    baseUrl: answers.baseUrl ?? "https://example.com",
    cosenseProject: answers.cosenseProject ?? "your-public-project",
  };
  final.projectName = final.targetDir.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  const targetPath = resolve(process.cwd(), final.targetDir);
  await ensureEmpty(targetPath);

  const templatePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../templates/default",
  );

  await copyTree(templatePath, targetPath);
  await renameDotfiles(targetPath);
  await applyPlaceholders(targetPath, {
    __PROJECT_NAME__: final.projectName,
    __SITE_TITLE__: final.siteTitle,
    __BASE_URL__: final.baseUrl,
    __PROJECT__: final.cosenseProject,
  });

  console.log();
  console.log(pc.green("✓ created"), targetPath);
  console.log();
  console.log("Next:");
  console.log(pc.cyan(`  cd ${final.targetDir}`));
  console.log(pc.cyan(`  npm install`));
  console.log(pc.cyan(`  npm run fetch`));
  console.log(pc.cyan(`  npm run dev`));
}

async function ask(initial: Partial<Answers>): Promise<Partial<Answers>> {
  const result = (await prompts(
    [
      {
        type: initial.targetDir ? null : "text",
        name: "targetDir",
        message: "Where should we create the site?",
        initial: "my-cosense-site",
      },
      {
        type: initial.siteTitle ? null : "text",
        name: "siteTitle",
        message: "Site title",
        initial: "My Cosense Site",
      },
      {
        type: initial.baseUrl ? null : "text",
        name: "baseUrl",
        message: "Site URL",
        initial: "https://example.com",
      },
      {
        type: initial.cosenseProject ? null : "text",
        name: "cosenseProject",
        message: "Public Cosense project name",
        initial: "your-public-project",
      },
    ],
    { onCancel: () => process.exit(1) },
  )) as Partial<Answers>;
  return { ...initial, ...result };
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

async function copyTree(from: string, to: string): Promise<void> {
  await cp(from, to, { recursive: true });
}

async function renameDotfiles(root: string): Promise<void> {
  await walk(root, async (filePath) => {
    const base = filePath.split("/").pop() ?? "";
    if (base.startsWith("_") && !base.startsWith("__")) {
      const renamed = join(dirname(filePath), `.${base.slice(1)}`);
      await rename(filePath, renamed);
    }
  });
}

async function applyPlaceholders(
  root: string,
  replacements: Record<string, string>,
): Promise<void> {
  await walk(root, async (filePath) => {
    const st = await stat(filePath);
    if (!st.isFile()) return;
    let content: string;
    try {
      content = await readFile(filePath, "utf8");
    } catch {
      return;
    }
    let next = content;
    for (const [k, v] of Object.entries(replacements)) {
      next = next.split(k).join(v);
    }
    if (next !== content) await writeFile(filePath, next);
  });
}

async function walk(root: string, fn: (path: string) => Promise<void>): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      await walk(p, fn);
    } else {
      await fn(p);
    }
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red("✗"), msg);
  process.exit(1);
});
