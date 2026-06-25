import { z } from "zod";

// Internal Cosense API response schemas. These are NOT exported from core —
// they're the wire format we're isolating from the rest of the framework.
// If the API changes, this file (plus normalize.ts) is the only place to fix.
//
// Validation is deliberately minimal: only the fields the framework actually
// consumes are checked, and `.loose()` passes everything else through. The
// goal is a clear "the Cosense API returned an unexpected shape" error at the
// wire boundary instead of an inscrutable crash deep inside normalize/parse
// (e.g. `new Date(NaN).toISOString()` throwing RangeError).

const cosenseUserSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    photo: z.string().optional(),
  })
  .loose();

export const cosenseListItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    updated: z.number(),
  })
  .loose();

export const cosenseListResponseSchema = z
  .object({
    count: z.number(),
    pages: z.array(cosenseListItemSchema),
  })
  .loose();

export const cosensePageResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    image: z.string().nullable().optional(),
    descriptions: z.array(z.string()).optional(),
    user: cosenseUserSchema.optional(),
    lastUpdateUser: cosenseUserSchema.optional(),
    collaborators: z.array(cosenseUserSchema).optional(),
    created: z.number(),
    updated: z.number(),
    lines: z.array(z.object({ text: z.string() }).loose()),
    links: z.array(z.string()).optional(),
  })
  .loose();

// Project metadata (GET /api/projects/<project>). We only consume `image`,
// the project's configured icon — the natural Scrapbox-native default favicon.
export const cosenseProjectResponseSchema = z
  .object({
    name: z.string(),
    image: z.string().nullable().optional(),
  })
  .loose();

export type CosenseListItem = z.infer<typeof cosenseListItemSchema>;
export type CosenseListResponse = z.infer<typeof cosenseListResponseSchema>;
export type CosensePageResponse = z.infer<typeof cosensePageResponseSchema>;
export type CosenseProjectResponse = z.infer<typeof cosenseProjectResponseSchema>;
