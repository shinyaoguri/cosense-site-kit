import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runDeployInit, workerName } from "../src/commands/deploy";
import { ACTION_VERSIONS, generateGithubActionsWorkflow } from "../src/generators/github-actions";
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

  it("a subdirectory site (npm consumer) fetches via the npm bin, not local dist", () => {
    // Regression: workingDirectory alone must NOT imply this repo's source-build
    // monorepo. A normal consumer whose site lives in a subdir installs the
    // framework from npm, so the workflow must never reference packages/cli/dist.
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({ target, workingDirectory: "site" });
      expect(yml).toContain("npx cosense-site fetch");
      expect(yml).not.toContain("packages/cli/dist");
      expect(yml).not.toContain("Build framework packages");
    }
  });

  it("uses direct node for the local cli but npx for astro in framework-dev mode", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
      frameworkDev: true,
    });
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions ${{ }} expression, not a JS template string
    expect(yml).toContain("node ${{ github.workspace }}/packages/cli/dist/index.js fetch");
    expect(yml).toContain("npx astro build");
    expect(yml).not.toContain("npx cosense-site");
    // The astro bin entry moved between Astro 5 and 6, so we must not hardcode it.
    expect(yml).not.toContain("node_modules/astro/astro.js");
  });

  it("installs at the workspace root only in framework-dev mode", () => {
    // Source build needs the whole workspace, so pin install to github.workspace.
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({
        target,
        workingDirectory: "site",
        frameworkDev: true,
      });
      expect(yml).toMatch(
        /- run: npm install\n\s+working-directory: \$\{\{ github\.workspace \}\}/,
      );
    }
  });

  it("installs in the working-directory for a subdirectory npm consumer", () => {
    // A subdir consumer's package.json (with @cosense-site-kit/* deps) lives in
    // the site dir; the job-level default working-directory already points there,
    // so no github.workspace override is emitted (which would install a
    // scriptless repo root and fail).
    const yml = generateGithubActionsWorkflow({ target: "github-pages", workingDirectory: "site" });
    expect(yml).toContain("- run: npm install");
    expect(yml).not.toMatch(
      /- run: npm install\n\s+working-directory: \$\{\{ github\.workspace \}\}/,
    );
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

  it("wires configure-pages base_path/origin into the Pages build (auto base)", () => {
    for (const wd of [undefined, "site"]) {
      const yml = generateGithubActionsWorkflow({ target: "github-pages", workingDirectory: wd });
      expect(yml).toContain("id: pages");
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression
      expect(yml).toContain("PAGES_BASE_PATH: ${{ steps.pages.outputs.base_path }}");
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression
      expect(yml).toContain("PAGES_ORIGIN: ${{ steps.pages.outputs.origin }}");
    }
  });

  it("does not inject Pages env into the Cloudflare workflow", () => {
    const yml = generateGithubActionsWorkflow({ target: "cloudflare-workers" });
    expect(yml).not.toContain("PAGES_BASE_PATH");
    expect(yml).not.toContain("steps.pages.outputs");
  });

  it("worker name falls back when the site title sanitizes to nothing", () => {
    expect(workerName("My Site", "my-proj")).toBe("my-site");
    // A fully Japanese title sanitizes to "" — wrangler rejects an empty name.
    expect(workerName("私のサイト", "my-proj")).toBe("my-proj");
    expect(workerName("私のサイト", "")).toBe("cosense-site");
  });

  it("never leaves a trailing hyphen in the worker name (invalid for wrangler)", () => {
    expect(workerName("Hello!", "p")).toBe("hello");
    // A hyphen landing exactly on the 63-char cut must be trimmed too.
    expect(workerName(`${"a".repeat(62)}!!`, "p")).toBe("a".repeat(62));
  });

  it("rejects a malformed --schedule instead of emitting a silent-no-fire cron", () => {
    expect(() =>
      generateGithubActionsWorkflow({ target: "github-pages", schedule: "bad" }),
    ).toThrow(/Invalid --schedule/);
  });

  it("rejects a working-directory that would break YAML", () => {
    expect(() =>
      generateGithubActionsWorkflow({ target: "github-pages", workingDirectory: "a b:c" }),
    ).toThrow(/Invalid --working-directory/);
  });

  it("keeps generated action versions in sync with the dogfood build.yml", () => {
    // dependabot bumps .github/workflows/build.yml but not this generator's
    // constants; assert they match so a bump there fails CI until ACTION_VERSIONS
    // follows.
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
    const buildYml = readFileSync(join(repoRoot, ".github/workflows/build.yml"), "utf8");
    const dogfood = new Map<string, string>();
    for (const m of buildYml.matchAll(/uses:\s*(actions\/[\w-]+)@(v\d+)/g)) {
      dogfood.set(m[1] as string, m[2] as string);
    }
    expect(dogfood.size).toBeGreaterThan(0);
    for (const pinned of Object.values(ACTION_VERSIONS)) {
      const [name, version] = pinned.split("@");
      const dogfoodVersion = dogfood.get(name as string);
      // Only actions the dogfood workflow also uses (it's Pages, so no wrangler).
      if (dogfoodVersion) expect(`${name}@${dogfoodVersion}`).toBe(`${name}@${version}`);
    }
  });

  it("uses a per-run cache key so the cache is re-saved after every run", () => {
    // actions/cache never saves on an exact key hit, so a fixed key (e.g.
    // github.ref) would freeze the cache at its first-run contents and the
    // differential fetch would re-download everything on every later run.
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({ target });
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions ${{ }} expression, not a JS template string
      expect(yml).toContain("key: cosense-cache-${{ github.run_id }}");
      expect(yml).toMatch(/restore-keys: \|\n\s+cosense-cache-/);
    }
  });

  it("serializes deploys so cron and manual dispatch never race", () => {
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({ target });
      expect(yml).toContain("concurrency:");
      expect(yml).toContain("cancel-in-progress: false");
    }
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

  it("builds workspace packages only in framework-dev mode", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
      frameworkDev: true,
    });
    expect(yml).toContain("Build framework packages");
    expect(yml).toContain("npm run build");
  });

  it("omits the workspace build step for an npm consumer (with or without a subdir)", () => {
    for (const workingDirectory of [undefined, "site"]) {
      const yml = generateGithubActionsWorkflow({ target: "github-pages", workingDirectory });
      expect(yml).not.toContain("Build framework packages");
    }
  });

  it("defaults to a twice-daily off-the-hour schedule", () => {
    const yml = generateGithubActionsWorkflow({ target: "cloudflare-workers" });
    expect(yml).toContain('cron: "17 1,13 * * *"');
  });

  it("inserts a doctor gate between fetch and build by default", () => {
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({ target });
      expect(yml).toContain("npx cosense-site doctor");
      // Ordering: fetch → doctor → build.
      expect(yml.indexOf("cosense-site fetch")).toBeLessThan(yml.indexOf("cosense-site doctor"));
      expect(yml.indexOf("cosense-site doctor")).toBeLessThan(yml.indexOf("astro build"));
    }
  });

  it("omits the doctor gate when doctor is false", () => {
    for (const target of ["cloudflare-workers", "github-pages"] as const) {
      const yml = generateGithubActionsWorkflow({ target, doctor: false });
      expect(yml).not.toContain("doctor");
    }
  });

  it("runs doctor via the local dist entry in framework-dev mode", () => {
    const yml = generateGithubActionsWorkflow({
      target: "github-pages",
      workingDirectory: "site",
      frameworkDev: true,
    });
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions ${{ }} expression
    expect(yml).toContain("node ${{ github.workspace }}/packages/cli/dist/index.js doctor");
    expect(yml).not.toContain("npx cosense-site");
  });
});

describe("runDeployInit target validation", () => {
  async function withConfig(fn: (dir: string) => Promise<void>): Promise<void> {
    const dir = await mkdtemp(join(tmpdir(), "cosense-deploy-"));
    await writeFile(
      join(dir, "cosense.config.mjs"),
      `export default { site: { title: "T", baseUrl: "https://e.com" }, source: { type: "cosense", project: "p" } };\n`,
    );
    try {
      await fn(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("rejects a typo'd target instead of writing a broken workflow", async () => {
    await withConfig(async (dir) => {
      await expect(
        runDeployInit({
          cwd: dir,
          configFile: "cosense.config.mjs",
          target: "github-page" as never,
        }),
      ).rejects.toThrow(/Invalid deploy target/);
    });
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
