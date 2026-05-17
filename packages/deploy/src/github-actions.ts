export interface GithubActionsOptions {
  /** Cron schedule. Default: "17 1,13 * * *" (twice daily, off-the-hour). */
  schedule?: string;
  /** Deployment target. */
  target: "cloudflare-workers" | "github-pages";
  /** Node version to use. Default: 24. */
  nodeVersion?: number;
}

export function generateGithubActionsWorkflow(opts: GithubActionsOptions): string {
  const schedule = opts.schedule ?? "17 1,13 * * *";
  const nodeVersion = opts.nodeVersion ?? 24;

  const deployStep =
    opts.target === "cloudflare-workers"
      ? CF_DEPLOY_STEP
      : opts.target === "github-pages"
        ? PAGES_DEPLOY_STEP
        : "";

  const permissions =
    opts.target === "github-pages"
      ? `      contents: read
      pages: write
      id-token: write`
      : `      contents: read`;

  return `name: Build and deploy

on:
  workflow_dispatch:
  schedule:
    - cron: "${schedule}"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
${permissions}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${nodeVersion}
          cache: npm

      - name: Restore Cosense cache
        uses: actions/cache@v4
        with:
          path: .cosense-cache
          key: cosense-cache-\${{ github.ref }}
          restore-keys: |
            cosense-cache-

      - run: npm ci
      - run: npx cosense-site fetch
      - run: npx astro build

${deployStep}
`;
}

const CF_DEPLOY_STEP = `      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy`;

const PAGES_DEPLOY_STEP = `      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4`;
