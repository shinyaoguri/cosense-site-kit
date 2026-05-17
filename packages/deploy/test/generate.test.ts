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

  it("emits a github-pages workflow with the required permissions", () => {
    const yml = generateGithubActionsWorkflow({ target: "github-pages" });
    expect(yml).toContain("actions/deploy-pages@v4");
    expect(yml).toContain("pages: write");
    expect(yml).toContain("id-token: write");
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
