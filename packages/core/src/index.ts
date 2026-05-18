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
export { loadCosenseSiteConfig } from "./load-config";

export * from "./schema";

export { createCosenseSource, type CosenseSourceOptions } from "./source/cosense";
export type { SiteSource, SourcePageRef, SourcePageRaw } from "./source/types";
export { normalizePage } from "./source/cosense/normalize";
export { parseScrapboxText, type ParsedPage } from "./parse/scrapbox";
export {
  parseSitePage,
  SiteConfigParseError,
  type SiteConfigResult,
} from "./parse/site-config";

export { applyPublishRules } from "./publish/filter";
export { assignSlugs, computeSlug, normalizeBase, pathFor } from "./resolve/slug";
export { buildTitleToSlug, resolveInternalLinks } from "./resolve/links";
export { resolveLinkData, type LinkData } from "./resolve/backlinks";
export {
  assignTemplates,
  resolveTemplate,
  DEFAULT_TEMPLATE,
} from "./resolve/template";
export {
  buildIntermediate,
  writeIntermediate,
  type BuildIntermediateOptions,
  type ProgressEvent,
} from "./pipeline";

export {
  runDoctor,
  type DoctorCheck,
  type DoctorReport,
  type RunDoctorOptions,
} from "./doctor";
