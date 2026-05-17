import { loadConfig } from "c12";
import {
  cosenseSiteConfigSchema,
  type CosenseSiteConfig,
  type CosenseSiteConfigInput,
} from "@cosense-site-kit/core";

// Loads a cosense.config.{ts,js,mjs} file via c12 (which uses jiti for TS).
// Pass an absolute path or a path relative to cwd. Throws if the file is
// missing or fails to parse.
export async function loadCosenseSiteConfig(
  configFile?: string,
): Promise<CosenseSiteConfig> {
  const { config } = await loadConfig<CosenseSiteConfigInput>({
    name: "cosense",
    configFile: configFile ?? "cosense.config",
    dotenv: false,
    globalRc: false,
  });
  if (!config || Object.keys(config).length === 0) {
    throw new Error(
      `Could not load cosense config from ${configFile ?? "cosense.config.{ts,js,mjs}"}`,
    );
  }
  return cosenseSiteConfigSchema.parse(config);
}
