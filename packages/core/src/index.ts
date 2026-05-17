// Public API surface for @cosense-site-kit/core.
// Anything exported here is the framework's stable contract; themes and the
// Astro integration consume only these types.

export const VERSION = "0.0.0";

export {
  defineCosenseSite,
  cosenseSiteConfigSchema,
  type CosenseSiteConfig,
  type CosenseSiteConfigInput,
} from "./config";

export * from "./schema";
