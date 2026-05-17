export interface WranglerOptions {
  name: string;
  /** Defaults to today's date in YYYY-MM-DD format. */
  compatibilityDate?: string;
  /** Static asset directory, relative to the project root. Default: ./dist */
  assetsDir?: string;
}

export function generateWranglerJsonc(opts: WranglerOptions): string {
  const date =
    opts.compatibilityDate ?? new Date().toISOString().slice(0, 10);
  const config = {
    $schema: "https://raw.githubusercontent.com/cloudflare/workerd/main/json-schema/wrangler.json",
    name: opts.name,
    compatibility_date: date,
    assets: {
      directory: opts.assetsDir ?? "./dist",
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}
