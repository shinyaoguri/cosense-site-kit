import { z } from "zod";

// SiteStructure is the typed shape of what authors declare in `.site` (or
// whatever page they configure as the site-config page) inside a single
// `code:site.yaml` block. Themes consume this through IntermediateData.

// `.site` is remote input (anyone with project edit rights can write it), and
// Astro's attribute escaping cannot neutralize a `javascript:` href — so URL
// shapes are enforced here, at the validated-model boundary.
// Allowed: absolute http(s) URL, mailto:/tel:, site-relative path (/blog —
// but not protocol-relative //host), or fragment (#about). Theme navHref
// helpers prefix site-relative paths with Astro's base.
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
// Redirect destinations are slugs or site-relative paths — never a scheme
// (no open redirects to external sites) and never protocol-relative.
const SAFE_REDIRECT = /^(?![a-z][a-z0-9+.-]*:)(?!\/\/)/i;

export const navItemSchema = z.union([
  z.object({ label: z.string().min(1), page: z.string().min(1) }),
  z.object({
    label: z.string().min(1),
    href: z
      .string()
      .min(1)
      .regex(
        SAFE_HREF,
        "href must be http(s)://, mailto:, tel:, a site-relative path, or #fragment",
      ),
  }),
]);

export const siteStructureSchema = z
  .object({
    home: z.object({ page: z.string().min(1) }).optional(),
    // Favicon source, authored in `.site` so it's set from the browser with no
    // repo edit. Either an absolute http(s) URL (used directly) or a Cosense
    // page title (that page's first image becomes the favicon). Any other shape
    // — including a `javascript:`/`data:` string — is treated as a page title,
    // so it can only ever resolve to a Cosense-hosted image, never reach `href`
    // as a raw URL. Resolution lives in pickFavicon (pipeline.ts).
    favicon: z.string().min(1).optional(),
    nav: z.array(navItemSchema).default([]),
    posts: z
      .object({
        tag: z.string().min(1),
        limit: z.number().int().positive().optional(),
        route: z.string().optional(),
      })
      .optional(),
    featured: z.array(z.string().min(1)).default([]),
    // Explicit redirects the operator wants, oldSlug → newSlug. Forwarded to
    // Astro's redirects. Authored in `.site`, so they can be managed from the
    // browser without touching the repo.
    redirects: z
      .record(
        z.string(),
        z
          .string()
          .regex(SAFE_REDIRECT, "redirect destinations must be a slug or site-relative path"),
      )
      .default({}),
    // Map from Cosense page title to template name. Used as a fallback when
    // the page itself doesn't carry a `#template/<name>` tag. The tag wins.
    templates: z.record(z.string(), z.string().min(1)).default({}),
    // Visual theme selection an operator can set from `.site` (browser-only,
    // no repo edit). A theme reads `theme.skin` to pick a named skin. `.loose()`
    // leaves room for future fields (e.g. ad-hoc `tokens`).
    theme: z
      .object({ skin: z.string().min(1).optional() })
      .loose()
      .optional(),
  })
  // .loose() keeps unknown top-level keys so plugins / custom themes can ship
  // their own sections (e.g. `members:`, `profile:`) without core changes.
  .loose();

export type SiteStructure = z.infer<typeof siteStructureSchema>;
export type SiteStructureInput = z.input<typeof siteStructureSchema>;
export type NavItem = z.infer<typeof navItemSchema>;

// Default SiteStructure used when no site-config page is present.
export function emptySiteStructure(): SiteStructure {
  return siteStructureSchema.parse({});
}
