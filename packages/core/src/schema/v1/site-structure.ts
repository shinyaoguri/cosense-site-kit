import { z } from "zod";
import { isSafeRedirect, SAFE_HREF } from "../../url";

// SiteStructure is the typed shape of what authors declare in `.site` (or
// whatever page they configure as the site-config page) inside a single
// `code:site.yaml` block. Themes consume this through IntermediateData.
//
// URL safety (SAFE_HREF / isSafeRedirect) lives in ../../url so the schema and
// theme-utils share one definition — see that file.

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
        // Trim first, then allowlist-check: a leading tab/space would let a
        // protocol-relative or scheme value slip past a naive leading anchor
        // because browsers strip those before parsing the URL.
        z
          .string()
          .trim()
          .refine(
            isSafeRedirect,
            "redirect destinations must be a slug or site-relative path (no scheme, no //, no control chars)",
          ),
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
