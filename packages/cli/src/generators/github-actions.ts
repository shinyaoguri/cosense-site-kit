export interface GithubActionsOptions {
  /** Cron schedule. Default: "17 1,13 * * *" (twice daily, off-the-hour). */
  schedule?: string;
  /** Deployment target. */
  target: "cloudflare-workers" | "github-pages";
  /** Node version to use. Default: 24. */
  nodeVersion?: number;
  /**
   * Working directory inside the repo where the Astro project lives.
   * Set to "site" when the docs site is at /site, or omit for repo root.
   * Default: "." (repo root).
   */
  workingDirectory?: string;
}

export function generateGithubActionsWorkflow(opts: GithubActionsOptions): string {
  const schedule = opts.schedule ?? "17 1,13 * * *";
  const nodeVersion = opts.nodeVersion ?? 24;
  const wd = opts.workingDirectory && opts.workingDirectory !== "." ? opts.workingDirectory : null;
  // Build local workspace packages before fetch only inside a monorepo (i.e.
  // when the site lives in a subdirectory); single-package consumers install
  // the framework from npm with dist/ already present.
  const buildWorkspaces = wd !== null;

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

// In a monorepo, the workspace cli is locally linked, but its bin target
// (packages/cli/dist/index.js) doesn't exist when npm install runs, so npm skips
// creating the bin symlink. Calling the file directly through node sidesteps
// that race entirely. astro is a normal published dependency, so its bin link
// is created reliably — `npx astro build` resolves the version-correct entry
// (the internal path moved between Astro 5 and 6) and runs in working-directory.
function renderMonorepoRunSteps(): string {
  return `      - run: node \${{ github.workspace }}/packages/cli/dist/index.js fetch
      - run: npx astro build`;
}

// Single-package consumers install @cosense-site-kit/cli from npm where the
// dist/ is already present, so npm creates a working bin link. npx is fine.
function renderRunSteps(): string {
  return `      - run: npx cosense-site fetch
      - run: npx astro build`;
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

      # Install at the repo root (not the job's working-directory) so the whole
      # npm workspace is installed in a monorepo — matches the Pages workflow.
      - run: npm install
        working-directory: \${{ github.workspace }}
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
        uses: actions/configure-pages@v6

      - run: npm install
        working-directory: \${{ github.workspace }}
${buildStep(a)}
${a.buildWorkspaces ? renderMonorepoRunSteps() : renderRunSteps()}

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
