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
  /**
   * When true, inject `npm run build` at the repo root before fetch so
   * workspace packages with unbuilt dist/ get compiled. Required when the
   * site consumes local workspace packages (i.e. inside this monorepo).
   * Default: true when workingDirectory is set, false otherwise.
   */
  buildWorkspaces?: boolean;
}

export function generateGithubActionsWorkflow(opts: GithubActionsOptions): string {
  const schedule = opts.schedule ?? "17 1,13 * * *";
  const nodeVersion = opts.nodeVersion ?? 24;
  const wd = opts.workingDirectory && opts.workingDirectory !== "." ? opts.workingDirectory : null;
  const buildWorkspaces = opts.buildWorkspaces ?? wd !== null;

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

function renderCloudflareWorkflow(a: RenderArgs): string {
  const wd = a.workingDirectory ? `\n    defaults:\n      run:\n        working-directory: ${a.workingDirectory}` : "";
  const cachePath = a.workingDirectory ? `${a.workingDirectory}/.cosense-cache` : ".cosense-cache";

  return `name: Build and deploy

on:
  workflow_dispatch:
  schedule:
    - cron: "${a.schedule}"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read${wd}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${a.nodeVersion}
          cache: npm

      - name: Restore Cosense cache
        uses: actions/cache@v4
        with:
          path: ${cachePath}
          key: cosense-cache-\${{ github.ref }}
          restore-keys: |
            cosense-cache-

      - run: npm ci
${buildStep(a)}
      - run: "\${{ github.workspace }}/node_modules/.bin/cosense-site fetch"
      - run: "\${{ github.workspace }}/node_modules/.bin/astro build"

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy${a.workingDirectory ? `\n          workingDirectory: ${a.workingDirectory}` : ""}
`;
}

function renderPagesWorkflow(a: RenderArgs): string {
  const wd = a.workingDirectory ? `\n    defaults:\n      run:\n        working-directory: ${a.workingDirectory}` : "";
  const cachePath = a.workingDirectory ? `${a.workingDirectory}/.cosense-cache` : ".cosense-cache";
  const distPath = a.workingDirectory ? `./${a.workingDirectory}/dist` : "./dist";

  // GH Pages needs:
  //   - actions/configure-pages to inject the correct base URL,
  //   - a "build" job that uploads ./dist as an artifact,
  //   - a "deploy" job pinned to the github-pages environment.
  // We keep a single Astro project but split into two GH Actions jobs so
  // actions/deploy-pages@v4 gets its required environment.
  return `name: Build and deploy

on:
  workflow_dispatch:
  schedule:
    - cron: "${a.schedule}"

# Required by actions/deploy-pages@v4.
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
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${a.nodeVersion}
          cache: npm

      - name: Restore Cosense cache
        uses: actions/cache@v4
        with:
          path: ${cachePath}
          key: cosense-cache-\${{ github.ref }}
          restore-keys: |
            cosense-cache-

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - run: npm ci
        working-directory: \${{ github.workspace }}
${buildStep(a)}
      - run: "\${{ github.workspace }}/node_modules/.bin/cosense-site fetch"
      - run: "\${{ github.workspace }}/node_modules/.bin/astro build"

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
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
        uses: actions/deploy-pages@v4
`;
}
