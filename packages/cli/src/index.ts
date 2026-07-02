import { createRequire } from "node:module";
import { DEPLOY_TARGETS, type DeployTarget } from "@cosense-site-kit/core";
import { Command, InvalidArgumentError, Option } from "commander";
import pc from "picocolors";
import { runDeployInit } from "./commands/deploy";
import { runDoctorCmd } from "./commands/doctor";
import { runFetch } from "./commands/fetch";
import { runInit } from "./commands/init";
import { runValidate } from "./commands/validate";

// Read the real version at runtime — a hardcoded constant inevitably drifts
// (it sat at "0.0.0" while the package shipped 0.1.x). ../package.json
// resolves from both src/ (tests) and dist/ (published bundle).
export const VERSION: string = (() => {
  try {
    const pkg = createRequire(import.meta.url)("../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

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
  // .choices rejects a typo (e.g. `github-page`) with a clear error and exit 1,
  // instead of writing a workflow that's incomplete for either target.
  .addOption(
    new Option("--target <target>", "Deploy target — overrides config").choices([
      ...DEPLOY_TARGETS,
    ]),
  )
  .option("--schedule <cron>", "Cron schedule for the build job")
  .option(
    "--working-directory <dir>",
    "Subdirectory where the site lives; scopes the run steps (e.g. site)",
  )
  .option("--repo-root <dir>", "Root of the repo to write .github/workflows into (default: cwd)")
  .option("--force", "Overwrite existing files")
  // Runs `cosense-site doctor` between fetch and build as a pre-publish gate
  // (fail → exit 1 stops the deploy; warnings don't). --no-doctor opts out.
  .option("--no-doctor", "Omit the pre-publish doctor gate from the workflow")
  // Internal: build the framework from source instead of installing from npm.
  // Only for this repo's own dogfooding site — hidden from --help so consumers
  // don't reach for it and generate a workflow referencing nonexistent paths.
  .addOption(new Option("--framework-dev", "Build the framework from source (internal)").hideHelp())
  .action(
    async (opts: {
      config?: string;
      target?: DeployTarget;
      schedule?: string;
      workingDirectory?: string;
      repoRoot?: string;
      force?: boolean;
      doctor?: boolean;
      frameworkDev?: boolean;
    }) => {
      await runDeployInit({
        cwd: process.cwd(),
        configFile: opts.config,
        target: opts.target,
        schedule: opts.schedule,
        workingDirectory: opts.workingDirectory,
        repoRoot: opts.repoRoot,
        force: opts.force,
        doctor: opts.doctor,
        frameworkDev: opts.frameworkDev,
      });
    },
  );

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red("✗"), msg);
  process.exit(1);
});
