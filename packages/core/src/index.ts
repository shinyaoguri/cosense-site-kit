// Public API surface for @cosense-site-kit/core.
//
// Anything exported from this file is part of the semver contract. Adding
// here means we commit to keeping it. Internal helpers (pipeline stages,
// parser internals, source adapters) intentionally don't appear and are
// only reachable via deep imports — those are not stable.

export const VERSION = "0.0.0";

// ── Asset vendoring (consumed by the Astro integration) ──────────────────
// Downloads `[name.icon]` images at build time so the site serves its own
// copies instead of hot-linking scrapbox.io (which blocks cross-origin <img>
// via Cross-Origin-Resource-Policy).
export { type VendorIconsOptions, vendorIcons, vendorImage } from "./assets/icons";
// ── Configuration ────────────────────────────────────────────────────────
export { type CosenseSiteConfig, defineCosenseSite } from "./config";
// ── Diagnostics (consumed by the CLI) ────────────────────────────────────
export { type DoctorCheck, runDoctor } from "./doctor";
export { loadCosenseSiteConfig } from "./load-config";

// ── Pipeline (consumed by the Astro integration and the CLI) ─────────────
export { buildIntermediate, writeIntermediate } from "./pipeline";
// ── Path helpers (consumed by themes via theme-utils, and by the Astro
//   integration to compute the base URL once at config:setup time) ───────
export { normalizeBase, pathFor } from "./resolve/slug";
// ── Domain types & schemas ──────────────────────────────────────────────
// Types describe the intermediate model that flows from core → integration
// → themes. pageSchema is consumed by the Astro content-collection loader.
// emptySiteStructure is used by the integration during config:setup before
// the real .site page is parsed. The remaining schemas (block/inline/site-
// structure) stay package-internal — themes only need the types.
export type {
  CosenseBlock,
  CosenseSitePage,
  InlineNode,
  IntermediateData,
  NavItem,
  SchemaVersion,
  SiteStructure,
} from "./schema";
export { emptySiteStructure, pageSchema, SCHEMA_VERSION } from "./schema";
