// Public API surface for @cosense-site-kit/core.
//
// Anything exported from this file is part of the semver contract. Adding
// here means we commit to keeping it. Internal helpers (pipeline stages,
// parser internals, source adapters) intentionally don't appear and are
// only reachable via deep imports — those are not stable.

export const VERSION = "0.0.0";

// ── Configuration ────────────────────────────────────────────────────────
export { defineCosenseSite, type CosenseSiteConfig } from "./config";
export { loadCosenseSiteConfig } from "./load-config";

// ── Domain types & schemas ──────────────────────────────────────────────
// Types describe the intermediate model that flows from core → integration
// → themes. pageSchema is consumed by the Astro content-collection loader.
// emptySiteStructure is used by the integration during config:setup before
// the real .site page is parsed. The remaining schemas (block/inline/site-
// structure) stay package-internal — themes only need the types.
export type {
  CosenseBlock,
  InlineNode,
  CosenseSitePage,
  SiteStructure,
  IntermediateData,
  NavItem,
  SchemaVersion,
} from "./schema";
export { pageSchema, emptySiteStructure, SCHEMA_VERSION } from "./schema";

// ── Pipeline (consumed by the Astro integration and the CLI) ─────────────
export { buildIntermediate, writeIntermediate } from "./pipeline";

// ── Diagnostics (consumed by the CLI) ────────────────────────────────────
export { runDoctor, type DoctorCheck } from "./doctor";

// ── Path helpers (consumed by themes via theme-utils, and by the Astro
//   integration to compute the base URL once at config:setup time) ───────
export { normalizeBase, pathFor } from "./resolve/slug";
