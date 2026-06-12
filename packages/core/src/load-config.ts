import { loadConfig } from "c12";
import {
  type CosenseSiteConfig,
  type CosenseSiteConfigInput,
  cosenseSiteConfigSchema,
} from "./config";

// Loads cosense.config.{ts,js,mjs} via c12 (which uses jiti for TS support).
// Pass an absolute path or a path relative to cwd. Throws if the file is
// missing or fails schema validation.
export async function loadCosenseSiteConfig(
  configFile?: string,
  cwd?: string,
): Promise<CosenseSiteConfig> {
  const { config } = await loadConfig<CosenseSiteConfigInput>({
    name: "cosense",
    configFile: configFile ?? "cosense.config",
    cwd,
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
