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
  out?: string;
  force?: boolean;
  concurrency?: number;
}

export async function runFetch(opts: FetchOptions): Promise<void> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  const cacheDir = resolve(opts.cwd, opts.cacheDir ?? ".cosense-cache");
  const out = resolve(opts.cwd, opts.out ?? `${cacheDir}/intermediate.json`);

  console.log(pc.dim(`source : cosense:${config.source.project}`));
  console.log(pc.dim(`cache  : ${cacheDir}`));
  console.log(pc.dim(`out    : ${out}`));

  const data = await buildIntermediate({
    config,
    cacheDir,
    force: opts.force,
    concurrency: opts.concurrency,
    onProgress: (e) => {
      if (e.kind === "list") console.log(pc.cyan(`→ list   ${e.total} page(s)`));
      else if (e.kind === "fetch") {
        if (e.current % 10 === 0 || e.current === e.total) {
          console.log(pc.dim(`  fetch  ${e.current}/${e.total} ${e.title}`));
        }
      } else if (e.kind === "publish") {
        console.log(
          pc.cyan(`→ publish kept=${e.kept} excluded=${e.excluded}`),
        );
      }
    },
  });

  await writeIntermediate(data, out);
  console.log(pc.green(`✓ wrote ${data.pages.length} page(s) → ${out}`));
}
