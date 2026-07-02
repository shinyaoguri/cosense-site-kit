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
}

export function generateGithubActionsWorkflow(opts: GithubActionsOptions): string {
  const schedule = opts.schedule ?? "17 1,13 * * *";
  const nodeVersion = opts.nodeVersion ?? 24;
  const wd = opts.workingDirectory && opts.workingDirectory !== "." ? opts.workingDirectory : null;
  // "Site in a subdirectory" and "framework built from source" are independent:
  // only this repo's own workspace needs the source build. Deriving it from wd
  // (the old behavior) generated a workflow that referenced packages/cli/dist
  // for every consumer whose site lived in a subdir — which always failed.
  const buildWorkspaces = opts.frameworkDev === true;

  if (opts.target === "github-pages") {
    return renderPagesWorkflow({
      schedule,
      nodeVersion,
      workingDirectory: wd,
      buildWorkspaces,
    });
  }
  return renderCloudflareWorkflow({
    schedule,
    nodeVersion,
    workingDirectory: wd,
    buildWorkspaces,
  });
}

interface RenderArgs {
  schedule: string;
  nodeVersion: number;
  workingDirectory: string | null;
  buildWorkspaces: boolean;
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

// In a monorepo, the workspace cli is locally linked, but its bin target
// (packages/cli/dist/index.js) doesn't exist when npm install runs, so npm skips
// creating the bin symlink. Calling the file directly through node sidesteps
// that race entirely. astro is a normal published dependency, so its bin link
// is created reliably — `npx astro build` resolves the version-correct entry
// (the internal path moved between Astro 5 and 6) and runs in working-directory.
function renderMonorepoRunSteps(pagesEnv = false): string {
  return `      - run: node \${{ github.workspace }}/packages/cli/dist/index.js fetch
      - run: npx astro build${pagesBuildEnv(pagesEnv)}`;
}

// Single-package consumers install @cosense-site-kit/cli from npm where the
// dist/ is already present, so npm creates a working bin link. npx is fine.
function renderRunSteps(pagesEnv = false): string {
  return `      - run: npx cosense-site fetch
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
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: ${a.nodeVersion}

      # The key must be unique per run: actions/cache never saves on an exact
      # hit, so a fixed key would freeze the cache at its first-run contents
      # and the differential fetch would re-download everything ever after.
      - name: Restore Cosense cache
        uses: actions/cache@v5
        with:
          path: ${cachePath}
          key: cosense-cache-\${{ github.run_id }}
          restore-keys: |
            cosense-cache-

${installStep(a)}
${buildStep(a)}
${a.buildWorkspaces ? renderMonorepoRunSteps() : renderRunSteps()}

      - name: Deploy to Cloudflare Workers (Static Assets)
        uses: cloudflare/wrangler-action@v4
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

# Required by actions/deploy-pages.
permissions:
  contents: read
  pages: write
  id-token: write

# Avoid concurrent deploys racing each other.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest${wd}
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: ${a.nodeVersion}

      # The key must be unique per run: actions/cache never saves on an exact
      # hit, so a fixed key would freeze the cache at its first-run contents
      # and the differential fetch would re-download everything ever after.
      - name: Restore Cosense cache
        uses: actions/cache@v5
        with:
          path: ${cachePath}
          key: cosense-cache-\${{ github.run_id }}
          restore-keys: |
            cosense-cache-

      - name: Configure Pages
        id: pages
        uses: actions/configure-pages@v6

${installStep(a)}
${buildStep(a)}
${a.buildWorkspaces ? renderMonorepoRunSteps(true) : renderRunSteps(true)}

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: ${distPath}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deploy.outputs.page_url }}
    steps:
      - id: deploy
        uses: actions/deploy-pages@v5
`;
}
