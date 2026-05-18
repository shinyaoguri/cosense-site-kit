import { loadCosenseSiteConfig, runDoctor } from "@cosense-site-kit/core";
import type { DoctorCheck } from "@cosense-site-kit/core";
import pc from "picocolors";

export interface DoctorOptions {
  cwd: string;
  configFile?: string;
  cacheDir?: string;
  force?: boolean;
}

const SYMBOL = {
  pass: pc.green("✓"),
  warn: pc.yellow("⚠"),
  fail: pc.red("✗"),
};

export async function runDoctorCmd(opts: DoctorOptions): Promise<number> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  console.log(pc.bold(`Doctor report for "${config.source.project}"`));
  console.log();

  const report = await runDoctor({
    config,
    cacheDir: opts.cacheDir,
    force: opts.force,
  });

  if (report.fatalError) {
    console.log(`${SYMBOL.fail} ${pc.bold("Pipeline crashed")} — ${report.fatalError}`);
    console.log();
    return 1;
  }

  let pass = 0;
  let warn = 0;
  let fail = 0;
  for (const check of report.checks) {
    printCheck(check);
    if (check.status === "pass") pass++;
    else if (check.status === "warn") warn++;
    else fail++;
  }

  console.log();
  console.log(
    pc.bold("Summary:"),
    `${pc.green(`${pass} ok`)}, ${pc.yellow(`${warn} warn`)}, ${pc.red(`${fail} fail`)}`,
  );
  return report.ok ? 0 : 1;
}

function printCheck(c: DoctorCheck): void {
  console.log(`  ${SYMBOL[c.status]} ${c.name}  ${pc.dim(c.message)}`);
  if (c.details && c.details.length > 0) {
    for (const d of c.details.slice(0, 10)) {
      console.log(`      ${pc.dim("·")} ${d}`);
    }
    if (c.details.length > 10) {
      console.log(`      ${pc.dim(`… and ${c.details.length - 10} more`)}`);
    }
  }
}
