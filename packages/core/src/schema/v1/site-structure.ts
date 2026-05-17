import { z } from "zod";

// SiteStructure is the typed shape of what authors declare in `.site` (or
// whatever page they configure as the site-config page) inside a single
// `code:site.yaml` block. Themes consume this through IntermediateData.

export const navItemSchema = z.union([
  z.object({ label: z.string().min(1), page: z.string().min(1) }),
  z.object({ label: z.string().min(1), href: z.string().url() }),
]);

export const siteStructureSchema = z
  .object({
    home: z.object({ page: z.string().min(1) }).optional(),
    nav: z.array(navItemSchema).default([]),
    posts: z
      .object({
        tag: z.string().min(1),
        limit: z.number().int().positive().optional(),
        route: z.string().optional(),
      })
      .optional(),
    featured: z.array(z.string().min(1)).default([]),
    redirects: z.record(z.string(), z.string()).default({}),
  })
  // .passthrough() keeps unknown top-level keys so plugins / custom themes can
  // ship their own sections (e.g. `members:`, `profile:`) without core changes.
  .passthrough();

export type SiteStructure = z.infer<typeof siteStructureSchema>;
export type SiteStructureInput = z.input<typeof siteStructureSchema>;
export type NavItem = z.infer<typeof navItemSchema>;

// Default SiteStructure used when no site-config page is present.
export function emptySiteStructure(): SiteStructure {
  return siteStructureSchema.parse({});
}
