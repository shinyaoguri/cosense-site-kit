import { describe, expect, it } from "vitest";
import { generateGithubActionsWorkflow } from "../src/generators/github-actions";
import { generateWranglerJsonc } from "../src/generators/wrangler";

describe("generateGithubActionsWorkflow", () => {
  it("emits a cloudflare-workers workflow with the configured schedule", () => {
    const yml = generateGithubActionsWorkflow({
      target: "cloudflare-workers",
      schedule: "5 0,12 * * *",
    });
    expect(yml).toContain('cron: "5 0,12 * * *"');
    expect(yml).toContain("cloudflare/wrangler-action@v4");
    expect(yml).toContain("npx cosense-site fetch");
    expect(yml).toContain("npx astro build");
  });

  it("uses direct node for the local cli but npx for astro in monorepo mode", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
    });
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions ${{ }} expression, not a JS template string
    expect(yml).toContain("node ${{ github.workspace }}/packages/cli/dist/index.js fetch");
    expect(yml).toContain("npx astro build");
    expect(yml).not.toContain("npx cosense-site");
    // The astro bin entry moved between Astro 5 and 6, so we must not hardcode it.
    expect(yml).not.toContain("node_modules/astro/astro.js");
  });

  it("installs at the workspace root in a monorepo so all packages install", () => {
    // The job's working-directory points at the subdir; npm install must opt
    // back out to github.workspace so the whole workspace installs (matches the
    // Pages workflow).
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({ target, workingDirectory: "site" });
      expect(yml).toMatch(
        /- run: npm install\n\s+working-directory: \$\{\{ github\.workspace \}\}/,
      );
    }
  });

  it("emits a github-pages workflow with build/deploy jobs and env binding", () => {
    const yml = generateGithubActionsWorkflow({ target: "github-pages" });
    expect(yml).toContain("actions/configure-pages@v6");
    expect(yml).toContain("actions/upload-pages-artifact@v5");
    expect(yml).toContain("actions/deploy-pages@v5");
    expect(yml).toContain("pages: write");
    expect(yml).toContain("id-token: write");
    expect(yml).toContain("name: github-pages");
    expect(yml).toContain("concurrency:");
  });

  it("scopes commands to a subdirectory when workingDirectory is set", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
    });
    expect(yml).toContain("working-directory: site");
    expect(yml).toContain("path: site/.cosense-cache");
    expect(yml).toContain("path: ./site/dist");
  });

  it("auto-builds workspace packages when workingDirectory implies a monorepo", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
    });
    expect(yml).toContain("Build framework packages");
    expect(yml).toContain("npm run build");
  });

  it("omits the workspace build step for a single-package site", () => {
    const yml = generateGithubActionsWorkflow({ target: "github-pages" });
    expect(yml).not.toContain("Build framework packages");
  });

  it("defaults to a twice-daily off-the-hour schedule", () => {
    const yml = generateGithubActionsWorkflow({ target: "cloudflare-workers" });
    expect(yml).toContain('cron: "17 1,13 * * *"');
  });
});

describe("generateWranglerJsonc", () => {
  it("produces a Workers Static Assets config", () => {
    const out = generateWranglerJsonc({ name: "my-site" });
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe("my-site");
    expect(parsed.assets.directory).toBe("./dist");
    expect(parsed.assets.not_found_handling).toBe("404-page");
    expect(parsed.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
