import { resolve } from "node:path";
import {
  buildIntermediate,
  loadCosenseSiteConfig,
  writeIntermediate,
} from "@cosense-site-kit/core";
import pc from "picocolors";

export interface FetchOptions {
  cwd: string;
  configFile?: string;
  cacheDir?: string;
  /** When set, also write the full IntermediateData JSON to this path. */
  exportPath?: string;
  force?: boolean;
  concurrency?: number;
}

export async function runFetch(opts: FetchOptions): Promise<void> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  const cacheDir = resolve(opts.cwd, opts.cacheDir ?? ".cosense-cache");

  console.log(pc.dim(`source : cosense:${config.source.project}`));
  console.log(pc.dim(`cache  : ${cacheDir}`));

  const data = await buildIntermediate({
    config,
    cacheDir,
    force: opts.force,
    concurrency: opts.concurrency,
    onProgress: (e) => {
      switch (e.kind) {
        case "list":
          console.log(pc.cyan(`→ list   ${e.total} page(s)`));
          break;
        case "fetch":
          if (e.current % 10 === 0 || e.current === e.total) {
            console.log(pc.dim(`  fetch  ${e.current}/${e.total} ${e.title}`));
          }
          break;
        case "publish":
          console.log(pc.cyan(`→ publish kept=${e.kept} excluded=${e.excluded}`));
          break;
        case "site-config":
          if (!e.found) {
            console.log(
              pc.yellow(
                `⚠ site-config page "${config.siteConfig.page}" not found — using defaults`,
              ),
            );
          }
          break;
        case "warn":
          console.log(pc.yellow(`⚠ ${e.message}`));
          break;
        case "normalize":
          // quiet: implied by fetch completion
          break;
      }
    },
  });

  console.log(pc.green(`✓ ${data.pages.length} page(s) ready`));
  for (const w of data.warnings) console.log(pc.yellow(`⚠ ${w}`));

  if (opts.exportPath) {
    const out = resolve(opts.cwd, opts.exportPath);
    await writeIntermediate(data, out);
    console.log(pc.green(`✓ wrote intermediate JSON → ${out}`));
  }
}
