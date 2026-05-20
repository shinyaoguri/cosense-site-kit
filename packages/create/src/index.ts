import { cp, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import pc from "picocolors";
import prompts from "prompts";
import { buildThemeWiring, type CatalogTheme, catalog, resolveSkin, resolveTheme } from "./catalog";

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
      theme: { type: "string" },
      skin: { type: "string" },
      yes: { type: "boolean", short: "y", default: false },
    },
  });

  const argDir = positionals[0];

  // Resolve the theme: an explicit `--theme` wins (and fails loudly on a typo);
  // otherwise the interactive picker offers the catalog when there's more than
  // one theme, falling back to the first.
  const theme = await resolveThemeChoice(values.theme, !values.yes);

  const fromFlags = {
    targetDir: argDir,
    siteTitle: values.title,
    baseUrl: values.url,
    cosenseProject: values.project,
    skin: values.skin,
  };

  const answers = values.yes ? fromFlags : await ask(fromFlags, theme);

  const final: Answers = {
    targetDir: answers.targetDir ?? "my-cosense-site",
    projectName: "",
    siteTitle: answers.siteTitle ?? "My Cosense Site",
    baseUrl: answers.baseUrl ?? "https://example.com",
    cosenseProject: answers.cosenseProject ?? "your-public-project",
  };
  final.projectName = final.targetDir.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  const skin = resolveSkin(theme, answers.skin);
  const wiring = buildThemeWiring(theme, skin);

  const targetPath = resolve(process.cwd(), final.targetDir);
  await ensureEmpty(targetPath);

  const templatePath = resolve(dirname(fileURLToPath(import.meta.url)), "../templates/default");

  await copyTree(templatePath, targetPath);
  await renameDotfiles(targetPath);
  await applyPlaceholders(targetPath, {
    __PROJECT_NAME__: final.projectName,
    __SITE_TITLE__: final.siteTitle,
    __BASE_URL__: final.baseUrl,
    __PROJECT__: final.cosenseProject,
    __THEME_IMPORT__: wiring.import,
    __THEME_INTEGRATION__: wiring.integration,
    __THEME_PACKAGE__: theme.package,
    __THEME_VERSION__: theme.version,
  });

  console.log();
  console.log(pc.green("✓ created"), targetPath);
  console.log(pc.dim(`  theme: ${theme.name} · skin: ${skin.name}`));
  console.log();
  console.log("Next:");
  console.log(pc.cyan(`  cd ${final.targetDir}`));
  console.log(pc.cyan(`  npm install`));
  console.log(pc.cyan(`  npm run fetch`));
  console.log(pc.cyan(`  npm run dev`));
}

interface FlagAnswers extends Partial<Answers> {
  skin?: string;
}

// Pick the theme: an explicit flag wins; otherwise prompt only when the catalog
// has more than one theme. Falls back to the first theme (no-prompt single-theme
// case and --yes).
async function resolveThemeChoice(
  themeFlag: string | undefined,
  interactive: boolean,
): Promise<CatalogTheme> {
  if (themeFlag) return resolveTheme(themeFlag);
  if (interactive && catalog.themes.length > 1) {
    const { theme } = (await prompts(
      {
        type: "select",
        name: "theme",
        message: "Theme",
        choices: catalog.themes.map((t) => ({
          title: t.name,
          description: t.description,
          value: t.id,
        })),
      },
      { onCancel: () => process.exit(1) },
    )) as { theme?: string };
    return resolveTheme(theme);
  }
  return resolveTheme();
}

async function ask(initial: FlagAnswers, theme: CatalogTheme): Promise<FlagAnswers> {
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
      {
        // Offer the chosen theme's skins. Skipped when --skin was passed or the
        // theme ships a single look.
        type: initial.skin || theme.skins.length < 2 ? null : "select",
        name: "skin",
        message: `Skin (${theme.name})`,
        choices: theme.skins.map((s) => ({
          title: s.default ? `${s.name} (default)` : s.name,
          value: s.id,
        })),
        initial: Math.max(
          0,
          theme.skins.findIndex((s) => s.default),
        ),
      },
    ],
    { onCancel: () => process.exit(1) },
  )) as FlagAnswers;
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
