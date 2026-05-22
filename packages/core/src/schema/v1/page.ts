import { z } from "zod";
import { blockSchema, type CosenseBlock } from "./block";
import { type SiteStructure, siteStructureSchema } from "./site-structure";

export interface CosenseSitePage {
  schemaVersion: "1";
  id: string;
  title: string;
  slug: string;
  sourceUrl: string;
  /**
   * Template the theme should render this page with. Resolved by the pipeline
   * from (in order): `#template/<name>` tag, .site YAML structure.templates
   * mapping, or the default "page". Themes look this up in their own template
   * map; unknown names should fall back to "page".
   */
  template: string;
  /** Raw Cosense timestamps (source of truth, never overridden by the user). */
  createdAt?: string;
  updatedAt?: string;
  /**
   * Resolved display dates. Users may override the Cosense timestamps with
   * `#published/YYYY-MM-DD` and `#updated/YYYY-MM-DD` tags; an absent or invalid
   * tag falls back to createdAt / updatedAt respectively. Themes sort and render
   * these rather than the raw createdAt/updatedAt.
   */
  publishedAt?: string;
  modifiedAt?: string;
  summary?: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  authors?: string[];
  blocks: CosenseBlock[];
}

export const pageSchema = z.object({
  schemaVersion: z.literal("1"),
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  sourceUrl: z.string().url(),
  template: z.string().min(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  modifiedAt: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()),
  links: z.array(z.string()),
  backlinks: z.array(z.string()),
  authors: z.array(z.string()).optional(),
  blocks: z.array(blockSchema),
});

// Inferred from the schema so fields with `.default()` (inside SiteStructure)
// keep matching the actual parsed shape. Explicit interface + `z.ZodType<T>`
// cast can't carry default-induced input/output divergence.
export const intermediateDataSchema = z.object({
  schemaVersion: z.literal("1"),
  generatedAt: z.string(),
  site: z.object({
    title: z.string(),
    description: z.string().optional(),
    baseUrl: z.string().url(),
    lang: z.string(),
    // Favicon source: the representative image of the project's first page
    // (or the configured home page). Mirrors Cosense, where the top page's
    // icon becomes the project favicon. Resolved by the pipeline; the Astro
    // integration vendors it locally and a theme renders it as <link rel=icon>.
    icon: z.string().optional(),
  }),
  pages: z.array(pageSchema),
  excluded: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  linkGraph: z.record(z.string(), z.array(z.string())),
  structure: siteStructureSchema,
  warnings: z.array(z.string()),
});

export type IntermediateData = z.infer<typeof intermediateDataSchema>;
// Reference SiteStructure so dropping the import doesn't break tooling.
export type { SiteStructure };
