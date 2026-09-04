// Pinned GitHub Action versions. Single source of truth so the generated
// workflow can't quietly drift from this repo's own .github/workflows/build.yml
// (dependabot bumps that file but not string literals in this generator). A test
// asserts these match the dogfood workflow, so a bump there fails CI until this
// table follows.
export const ACTION_VERSIONS = {
  checkout: "actions/checkout@v7",
  setupNode: "actions/setup-node@v7",
  cache: "actions/cache@v6",
  configurePages: "actions/configure-pages@v6",
  uploadPagesArtifact: "actions/upload-pages-artifact@v5",
  deployPages: "actions/deploy-pages@v5",
  wranglerAction: "cloudflare/wrangler-action@v4",
} as const;

export interface GithubActionsOptions {
  /** Cron schedule. Default: "17 1,13 * * *" (twice daily, off-the-hour). */
  schedule?: string;
  /** Deployment target. */
  target: "cloudflare-workers" | "github-pages";
  /** Node version to use. Default: 24. */
  nodeVersion?: number;
  /**
   * Working directory inside the repo where the Astro project lives.
   * Set to "site" when the site is at /site, or omit for repo root.
   * Default: "." (repo root). This only scopes the run steps and cache/dist
   * paths — it does NOT imply the framework is built from source (see
   * frameworkDev). A normal npm consumer whose site lives in a subdirectory
   * installs the framework from npm and runs `npx cosense-site fetch`.
   */
  workingDirectory?: string;
  /**
   * Build the @cosense-site-kit/* workspace packages from source before the
   * fetch step, and invoke the CLI through its local dist entry rather than the
   * npm bin. This is ONLY for this repository's own dogfooding site (the
   * framework and the site live in one workspace); npm consumers must leave it
   * off or the generated workflow references paths (packages/cli/dist) that
   * don't exist in their repo. Default: false.
   */
  frameworkDev?: boolean;
  /**
   * Insert a `cosense-site doctor` step between fetch and build as a pre-publish
   * gate: doctor exits 1 only on `fail` checks (warnings exit 0), so it stops a
   * broken deploy without over-blocking cron on mere warnings. Default: true.
   */
  doctor?: boolean;
}

// A cron string is interpolated into the workflow; a malformed one produces a
// workflow that never fires (GitHub reports no error). Require the standard 5
// space-separated fields of cron-safe characters.
function assertValidCron(schedule: string): void {
  const fields = schedule.trim().split(/\s+/);
  const ok = fields.length === 5 && fields.every((f) => /^[0-9*/,-]+$/.test(f));
  if (!ok) {
    throw new Error(
      `Invalid --schedule "${schedule}". Expected 5 cron fields, e.g. "17 1,13 * * *".`,
    );
  }
}

// workingDirectory is interpolated (mostly unquoted) into YAML; a value with
// spaces, quotes or colons would produce invalid YAML. Restrict it to a plain
// relative path rather than trying to quote it in every interpolation site.
function assertValidWorkingDirectory(dir: string): void {
  if (!/^[A-Za-z0-9._/-]+$/.test(dir) || dir.includes("..")) {
    throw new Error(`Invalid --working-directory "${dir}". Use a plain relative path like "site".`);
  }
}

export function generateGithubActionsWorkflow(opts: GithubActionsOptions): string {
  const schedule = opts.schedule ?? "17 1,13 * * *";
  // Validate up front so a bad value fails generation loudly, not silently at CI
  // time (an unquoted odd directory → invalid YAML; a malformed cron → a
  // workflow that never fires, with no error).
  assertValidCron(schedule);
  if (opts.workingDirectory) assertValidWorkingDirectory(opts.workingDirectory);
  const nodeVersion = opts.nodeVersion ?? 24;
  const wd = opts.workingDirectory && opts.workingDirectory !== "." ? opts.workingDirectory : null;
  // "Site in a subdirectory" and "framework built from source" are independent:
  // only this repo's own workspace needs the source build. Deriving it from wd
  // (the old behavior) generated a workflow that referenced packages/cli/dist
  // for every consumer whose site lived in a subdir — which always failed.
  const buildWorkspaces = opts.frameworkDev === true;
  const doctor = opts.doctor !== false;

  if (opts.target === "github-pages") {
    return renderPagesWorkflow({
      schedule,
      nodeVersion,
      workingDirectory: wd,
      buildWorkspaces,
      doctor,
    });
  }
  return renderCloudflareWorkflow({
    schedule,
    nodeVersion,
    workingDirectory: wd,
    buildWorkspaces,
    doctor,
  });
}

interface RenderArgs {
  schedule: string;
  nodeVersion: number;
  workingDirectory: string | null;
  buildWorkspaces: boolean;
  doctor: boolean;
}

function buildStep(a: RenderArgs): string {
  if (!a.buildWorkspaces) return "";
  return `
      - name: Build framework packages
        run: npm run build
        working-directory: \${{ github.workspace }}`;
}

// Install dependencies. In the source-build (dogfooding) case the whole npm
// workspace must be installed, so pin the step to the repo root regardless of
// the job's working-directory. A normal consumer installs where their
// package.json (with the @cosense-site-kit/* deps) lives — the job's
// working-directory, which the job-level `defaults.run` already sets — so no
// override is emitted, and a subdir site with its own package.json installs
// correctly instead of failing at a scriptless repo root.
function installStep(a: RenderArgs): string {
  if (a.buildWorkspaces) {
    return `      - run: npm install
        working-directory: \${{ github.workspace }}`;
  }
  return `      - run: npm install`;
}

// How the workflow invokes the cosense-site CLI. In source-build (dogfooding)
// mode the workspace cli is locally linked but its bin target
// (packages/cli/dist/index.js) doesn't exist when npm install runs, so npm skips
// the bin symlink — call the file directly through node. npm consumers install
// @cosense-site-kit/cli from npm where dist/ is present, so `npx cosense-site`
// resolves a working bin.
function cliInvocation(a: RenderArgs): string {
  return a.buildWorkspaces
    ? // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions ${{ }} expression, not a JS template
      "node ${{ github.workspace }}/packages/cli/dist/index.js"
    : "npx cosense-site";
}

// fetch → (doctor) → astro build. astro is a normal published dependency, so
// `npx astro build` resolves the version-correct entry (its internal path moved
// between Astro 5 and 6) and runs in the job's working-directory.
function renderRunSteps(a: RenderArgs, pagesEnv = false): string {
  const cli = cliInvocation(a);
  const doctorStep = a.doctor ? `\n      - run: ${cli} doctor` : "";
  return `      - run: ${cli} fetch${doctorStep}
      - run: npx astro build${pagesBuildEnv(pagesEnv)}`;
}

// On GitHub Pages, feed configure-pages' detected base_path/origin to the build
// as PAGES_BASE_PATH / PAGES_ORIGIN. cosense.config.ts reads them into
// site.base / site.baseUrl, so the site works at any Pages URL (user page at
// "/" or project page at "/REPO") without the user editing the config — the
// classic cause of missing CSS on a renamed fork.
function pagesBuildEnv(pagesEnv: boolean): string {
  if (!pagesEnv) return "";
  return `
        env:
          PAGES_BASE_PATH: \${{ steps.pages.outputs.base_path }}
          PAGES_ORIGIN: \${{ steps.pages.outputs.origin }}`;
}

function renderCloudflareWorkflow(a: RenderArgs): string {
  const wd = a.workingDirectory
    ? `\n    defaults:\n      run:\n        working-directory: ${a.workingDirectory}`
    : "";
  const cachePath = a.workingDirectory ? `${a.workingDirectory}/.cosense-cache` : ".cosense-cache";

  return `name: Build and deploy

on:
  workflow_dispatch:
  schedule:
    - cron: "${a.schedule}"

# Avoid a manual dispatch racing a cron run into a half-deployed state.
concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read${wd}
    steps:
      - uses: ${ACTION_VERSIONS.checkout}

      - uses: ${ACTION_VERSIONS.setupNode}
        with:
          node-version: ${a.nodeVersion}

      # The key must be unique per run: actions/cache never saves on an exact
      # hit, so a fixed key would freeze the cache at its first-run contents
      # and the differential fetch would re-download everything ever after.
      - name: Restore Cosense cache
        uses: ${ACTION_VERSIONS.cache}
        with:
          path: ${cachePath}
          key: cosense-cache-\${{ github.run_id }}
          restore-keys: |
            cosense-cache-

${installStep(a)}
${buildStep(a)}
${renderRunSteps(a)}

      - name: Deploy to Cloudflare Workers (Static Assets)
        uses: ${ACTION_VERSIONS.wranglerAction}
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy${a.workingDirectory ? `\n          workingDirectory: ${a.workingDirectory}` : ""}
`;
}

function renderPagesWorkflow(a: RenderArgs): string {
  const wd = a.workingDirectory
    ? `\n    defaults:\n      run:\n        working-directory: ${a.workingDirectory}`
    : "";
  const cachePath = a.workingDirectory ? `${a.workingDirectory}/.cosense-cache` : ".cosense-cache";
  const distPath = a.workingDirectory ? `./${a.workingDirectory}/dist` : "./dist";

  // GH Pages needs:
  //   - actions/configure-pages to inject the correct base URL,
  //   - a "build" job that uploads ./dist as an artifact,
  //   - a "deploy" job pinned to the github-pages environment.
  // We keep a single Astro project but split into two GH Actions jobs so
  // actions/deploy-pages gets its required environment.
  return `name: Build and deploy

on:
  workflow_dispatch:
  schedule:
    - cron: "${a.schedule}"

# Avoid concurrent deploys racing each other.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    # Least privilege, but configure-pages runs *here* and reads
    # GET /repos/{owner}/{repo}/pages, so the build job needs Pages read or the
    # action 403s ("Resource not accessible by integration"). Write + the OIDC
    # token stay with the deploy job alone.
    permissions:
      contents: read
      pages: read${wd}
    steps:
      - uses: ${ACTION_VERSIONS.checkout}

      - uses: ${ACTION_VERSIONS.setupNode}
        with:
          node-version: ${a.nodeVersion}

      # The key must be unique per run: actions/cache never saves on an exact
      # hit, so a fixed key would freeze the cache at its first-run contents
      # and the differential fetch would re-download everything ever after.
      - name: Restore Cosense cache
        uses: ${ACTION_VERSIONS.cache}
        with:
          path: ${cachePath}
          key: cosense-cache-\${{ github.run_id }}
          restore-keys: |
            cosense-cache-

      - name: Configure Pages
        id: pages
        uses: ${ACTION_VERSIONS.configurePages}

${installStep(a)}
${buildStep(a)}
${renderRunSteps(a, true)}

      - name: Upload Pages artifact
        uses: ${ACTION_VERSIONS.uploadPagesArtifact}
        with:
          path: ${distPath}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    # Only the deploy job needs Pages write + the OIDC token.
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: \${{ steps.deploy.outputs.page_url }}
    steps:
      - id: deploy
        uses: ${ACTION_VERSIONS.deployPages}
`;
}
