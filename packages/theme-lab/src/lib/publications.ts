import type { CosenseBlock } from "@cosense-site-kit/core";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

// Lab-scope publications list: a flat list of papers grouped by year at
// render time. If another theme ever needs the same shape, factor it out
// into a shared package rather than duplicating it.

const publicationItemSchema = z.object({
  year: z.union([z.number(), z.string()]),
  authors: z.string(),
  title: z.string(),
  source: z.string(),
  url: z.string().optional(),
  peerReviewed: z.boolean().optional(),
  fullPaper: z.boolean().optional(),
});

export const publicationsSchema = z
  .object({
    publications: z.array(publicationItemSchema),
  })
  .passthrough();

export type PublicationItem = z.infer<typeof publicationItemSchema>;
export type PublicationsData = z.infer<typeof publicationsSchema>;

export function extractPublications(blocks: CosenseBlock[]): PublicationsData | null {
  const block = blocks.find(
    (b): b is Extract<CosenseBlock, { type: "code" }> =>
      b.type === "code" && b.filename === "publications.yaml",
  );
  if (!block) return null;
  try {
    const raw = parseYaml(block.value);
    return publicationsSchema.parse(raw);
  } catch (err) {
    console.warn(
      `[theme-lab] failed to parse code:publications.yaml — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

// Sort publications newest-first. `year` may be number or string (e.g.
// "2024.06") — coerce to string so localeCompare handles both deterministically.
export function sortPublicationsDesc(pubs: PublicationItem[]): PublicationItem[] {
  return [...pubs].sort((a, b) => String(b.year).localeCompare(String(a.year)));
}
