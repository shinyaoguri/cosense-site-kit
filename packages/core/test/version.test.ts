import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version";

const pkg = createRequire(import.meta.url)("../package.json") as { version: string };

describe("VERSION", () => {
  it("tracks the real package.json version (not a hardcoded 0.0.0)", () => {
    // Regression: the exported VERSION and the Cosense User-Agent used to be
    // pinned to "0.0.0" and never followed releases (changesets bumps the
    // package.json). Reading it at runtime keeps them in sync.
    expect(VERSION).toBe(pkg.version);
  });
});
