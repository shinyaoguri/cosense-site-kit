import { Command, InvalidArgumentError } from "commander";
import pc from "picocolors";
import { runDeployInit } from "./commands/deploy";
import { runDoctorCmd } from "./commands/doctor";
import { runFetch } from "./commands/fetch";
import { runInit } from "./commands/init";
import { runValidate } from "./commands/validate";

export const VERSION = "0.0.0";

// Reject a --concurrency that isn't a positive integer. parseInt would have
// silently turned "abc" into NaN, which downstream makes the fetch loop never
// advance and report zero pages — so fail loudly at the CLI boundary instead.
function parseConcurrency(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new InvalidArgumentError("expected a positive integer");
  }
  return n;
}

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
  .description("Fetch pages from Cosense into the local cache")
  .option("--config <file>", "Path to cosense.config.{ts,js,mjs}")
  .option("--cache-dir <dir>", "Cache directory (default .cosense-cache)")
  .option("--export <file>", "Also write the full intermediate model (pages + structure) to <file>")
  .option("--force", "Ignore cache and refetch everything")
  .option("--concurrency <n>", "Parallel fetch concurrency", parseConcurrency)
  .action(
    async (opts: {
      config?: string;
      cacheDir?: string;
      export?: string;
      force?: boolean;
      concurrency?: number;
    }) => {
      await runFetch({
        cwd: process.cwd(),
        configFile: opts.config,
        cacheDir: opts.cacheDir,
        exportPath: opts.export,
        force: opts.force,
        concurrency: opts.concurrency,
      });
    },
  );

program
  .command("validate")
  .description("Load and validate cosense.config without fetching")
  .option("--config <file>", "Path to cosense.config.{ts,js,mjs}")
  .action(async (opts: { config?: string }) => {
    await runValidate({ cwd: process.cwd(), configFile: opts.config });
  });

program
  .command("doctor")
  .description("Diagnose the project: config, publish rules, structure references, broken links")
  .option("--config <file>", "Path to cosense.config.{ts,js,mjs}")
  .option("--cache-dir <dir>", "Cache directory (default .cosense-cache)")
  .option("--force", "Ignore cache and refetch everything")
  .action(async (opts: { config?: string; cacheDir?: string; force?: boolean }) => {
    const code = await runDoctorCmd({
      cwd: process.cwd(),
      configFile: opts.config,
      cacheDir: opts.cacheDir,
      force: opts.force,
    });
    if (code !== 0) process.exit(code);
  });

const deploy = program.command("deploy").description("Deploy configuration helpers");
deploy
  .command("init")
  .description("Generate CI workflow and (for Workers) wrangler.jsonc")
  .option("--config <file>", "Path to cosense.config.{ts,js,mjs}")
  .option(
    "--target <target>",
    "cloudflare-workers (Workers Static Assets) | github-pages — overrides config",
  )
  .option("--schedule <cron>", "Cron schedule for the build job")
  .option("--working-directory <dir>", "Subdirectory of repoRoot where the site lives (monorepo)")
  .option("--repo-root <dir>", "Root of the repo to write .github/workflows into (default: cwd)")
  .option("--force", "Overwrite existing files")
  .action(
    async (opts: {
      config?: string;
      target?: "cloudflare-workers" | "github-pages";
      schedule?: string;
      workingDirectory?: string;
      repoRoot?: string;
      force?: boolean;
    }) => {
      await runDeployInit({
        cwd: process.cwd(),
        configFile: opts.config,
        target: opts.target,
        schedule: opts.schedule,
        workingDirectory: opts.workingDirectory,
        repoRoot: opts.repoRoot,
        force: opts.force,
      });
    },
  );

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red("✗"), msg);
  process.exit(1);
});
