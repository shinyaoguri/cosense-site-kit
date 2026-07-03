import { createRequire } from "node:module";

// Read the real package version at runtime so it tracks the published version
// instead of a hardcoded constant that inevitably drifts — this sat at "0.0.0"
// while the package shipped 0.4.x, so every client (and the Cosense User-Agent)
// reported 0.0.0. ../package.json resolves from both src/ (tests) and the
// bundled dist/ output, the same trick the CLI uses.
function readVersion(): string {
  try {
    const pkg = createRequire(import.meta.url)("../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const VERSION: string = readVersion();
