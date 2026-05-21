// Public schema surface (re-exported as @cosense-site-kit/core/schema). Exposes
// the intermediate-model TYPES that flow core → integration → themes, plus the
// two runtime values consumers actually need: `pageSchema` for the Astro
// content-collection loader, and `emptySiteStructure` for the integration's
// pre-fetch fallback. The Zod schema OBJECTS for block/inline/site-structure
// stay package-internal — reachable only via deep import within core — because
// consumers only ever need their types.

export type { CosenseBlock } from "./block";
export type { InlineNode } from "./inline";
export type { CosenseSitePage, IntermediateData } from "./page";
export { pageSchema } from "./page";
export type { NavItem, SiteStructure, SiteStructureInput } from "./site-structure";
export { emptySiteStructure } from "./site-structure";

export const SCHEMA_VERSION = "1" as const;
export type SchemaVersion = typeof SCHEMA_VERSION;
