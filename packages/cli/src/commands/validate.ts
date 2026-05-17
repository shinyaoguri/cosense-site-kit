import { loadCosenseSiteConfig } from "@cosense-site-kit/core";
import pc from "picocolors";

export interface ValidateOptions {
  cwd: string;
  configFile?: string;
}

export async function runValidate(opts: ValidateOptions): Promise<void> {
  const config = await loadCosenseSiteConfig(opts.configFile, opts.cwd);
  console.log(pc.green("✓ config is valid"));
  console.log(pc.dim("  site         "), config.site.title, pc.dim(`(${config.site.baseUrl})`));
  console.log(pc.dim("  source       "), `cosense:${config.source.project}`);
  console.log(
    pc.dim("  publish      "),
    `default=${config.publish.default}`,
    `include=${config.publish.includeTags.join(",")}`,
    `exclude=${config.publish.excludeTags.join(",")}`,
  );
  console.log(pc.dim("  routing.slug "), config.routing.slug);
  if (config.deploy) {
    console.log(
      pc.dim("  deploy       "),
      `target=${config.deploy.target}`,
      config.deploy.schedule ? `schedule="${config.deploy.schedule}"` : "",
    );
  }
}
