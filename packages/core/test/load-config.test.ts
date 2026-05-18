import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadCosenseSiteConfig } from "../src/load-config";

// Plain-object config (no imports). c12 / jiti loads this from a temp dir
// outside the workspace where `@cosense-site-kit/core` isn't resolvable; the
// framework's loader still runs zod validation on the parsed value, which is
// what we're testing here.
const MINIMAL_CONFIG_SOURCE = `
export default {
  site: {
    title: "Test",
    baseUrl: "https://example.com",
  },
  source: { type: "cosense", project: "demo" },
};
`;

describe("loadCosenseSiteConfig", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "cosense-config-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads a TypeScript config file", async () => {
    const path = join(dir, "cosense.config.ts");
    await writeFile(path, MINIMAL_CONFIG_SOURCE);
    const config = await loadCosenseSiteConfig(path, dir);
    expect(config.site.title).toBe("Test");
    expect(config.site.baseUrl).toBe("https://example.com");
    expect(config.source.project).toBe("demo");
  });

  it("populates defaults for omitted top-level sections", async () => {
    const path = join(dir, "cosense.config.ts");
    await writeFile(path, MINIMAL_CONFIG_SOURCE);
    const config = await loadCosenseSiteConfig(path, dir);
    // publish, routing, siteConfig should be filled in by the schema.
    expect(config.publish.includeTags).toContain("publish");
    expect(config.publish.excludeTags).toEqual(
      expect.arrayContaining(["draft", "private", "internal"]),
    );
    expect(config.siteConfig.page).toBe(".site");
  });

  it("throws a clear error when the config file is missing", async () => {
    await expect(
      loadCosenseSiteConfig(join(dir, "missing.config.ts"), dir),
    ).rejects.toThrow(/Could not load cosense config/);
  });

  it("throws when the config fails schema validation", async () => {
    const path = join(dir, "cosense.config.ts");
    await writeFile(
      path,
      `export default { site: { title: "T" } };`, // missing source + baseUrl
    );
    await expect(loadCosenseSiteConfig(path, dir)).rejects.toThrow();
  });
});
