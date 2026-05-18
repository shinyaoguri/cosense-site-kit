import { describe, expect, it } from "vitest";
import { generateGithubActionsWorkflow, generateWranglerJsonc } from "../src";

describe("generateGithubActionsWorkflow", () => {
  it("emits a cloudflare-workers workflow with the configured schedule", () => {
    const yml = generateGithubActionsWorkflow({
      target: "cloudflare-workers",
      schedule: "5 0,12 * * *",
    });
    expect(yml).toContain('cron: "5 0,12 * * *"');
    expect(yml).toContain("cloudflare/wrangler-action@v3");
    expect(yml).toContain("npx cosense-site fetch");
    expect(yml).toContain("npx astro build");
  });

  it("uses direct node invocation for the bins in monorepo mode", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
    });
    expect(yml).toContain("node ${{ github.workspace }}/packages/cli/dist/index.js fetch");
    expect(yml).toContain("node ${{ github.workspace }}/node_modules/astro/astro.js build");
    expect(yml).not.toContain("npx cosense-site");
  });

  it("emits a github-pages workflow with build/deploy jobs and env binding", () => {
    const yml = generateGithubActionsWorkflow({ target: "github-pages" });
    expect(yml).toContain("actions/configure-pages@v5");
    expect(yml).toContain("actions/upload-pages-artifact@v3");
    expect(yml).toContain("actions/deploy-pages@v4");
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
    expect(parsed.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
