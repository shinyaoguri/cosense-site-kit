import { Command } from "commander";
import pc from "picocolors";
import { runInit } from "./commands/init";
import { runFetch } from "./commands/fetch";
import { runBuild } from "./commands/build";
import { runValidate } from "./commands/validate";

export const VERSION = "0.0.0";

const program = new Command("cosense-site")
  .description("SSG framework for public Cosense projects")
  .version(VERSION);

program
  .command("init")
  .description("Create a starter cosense.config.ts in the current directory")
  .option("--project <name>", "Cosense project name to seed the config with")
  .option("--force", "Overwrite an existing cosense.config.ts")
  .action(async (opts: { project?: string; force?: boolean }) => {
    await runInit({ cwd: process.cwd(), project: opts.project, force: opts.force });
  });

program
  .command("fetch")
  .description("Fetch pages from Cosense and write intermediate.json")
  .option("--config <file>", "Path to cosense.config.{ts,js,mjs}")
  .option("--cache-dir <dir>", "Cache directory (default .cosense-cache)")
  .option("--out <file>", "Output path for intermediate.json")
  .option("--force", "Ignore cache and refetch everything")
  .option("--concurrency <n>", "Parallel fetch concurrency", (v) => Number.parseInt(v, 10))
  .action(
    async (opts: {
      config?: string;
      cacheDir?: string;
      out?: string;
      force?: boolean;
      concurrency?: number;
    }) => {
      await runFetch({
        cwd: process.cwd(),
        configFile: opts.config,
        cacheDir: opts.cacheDir,
        out: opts.out,
        force: opts.force,
        concurrency: opts.concurrency,
      });
    },
  );

program
  .command("build")
  .description("Run the underlying Astro build")
  .action(async () => {
    const code = await runBuild({ cwd: process.cwd() });
    if (code !== 0) process.exit(code);
  });

program
  .command("validate")
  .description("Load and validate cosense.config without fetching")
  .option("--config <file>", "Path to cosense.config.{ts,js,mjs}")
  .action(async (opts: { config?: string }) => {
    await runValidate({ cwd: process.cwd(), configFile: opts.config });
  });

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red("✗"), msg);
  process.exit(1);
});
