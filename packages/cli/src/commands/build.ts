import { spawn } from "node:child_process";
import pc from "picocolors";

export interface BuildOptions {
  cwd: string;
}

// Delegates to the local Astro CLI. The CLI lives in the user's project
// (a generated site has `astro` as a dependency), so we spawn via npx to
// resolve it from the project's node_modules first.
export async function runBuild(opts: BuildOptions): Promise<number> {
  console.log(pc.cyan("→ astro build"));
  return new Promise((resolveP) => {
    const child = spawn("npx", ["astro", "build"], {
      cwd: opts.cwd,
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolveP(code ?? 0));
  });
}
