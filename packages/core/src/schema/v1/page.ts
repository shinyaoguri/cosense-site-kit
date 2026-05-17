import { z } from "zod";
import { blockSchema, type CosenseBlock } from "./block";

export interface CosenseSitePage {
  schemaVersion: "1";
  id: string;
  title: string;
  slug: string;
  sourceUrl: string;
  createdAt?: string;
  updatedAt?: string;
  summary?: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  authors?: string[];
  blocks: CosenseBlock[];
  raw?: {
    text?: string;
  };
}

export const pageSchema: z.ZodType<CosenseSitePage> = z.object({
  schemaVersion: z.literal("1"),
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  sourceUrl: z.string().url(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()),
  links: z.array(z.string()),
  backlinks: z.array(z.string()),
  authors: z.array(z.string()).optional(),
  blocks: z.array(blockSchema),
  raw: z
    .object({
      text: z.string().optional(),
    })
    .optional(),
});

export interface IntermediateData {
  schemaVersion: "1";
  generatedAt: string;
  site: {
    title: string;
    description?: string;
    baseUrl: string;
    lang: string;
  };
  pages: CosenseSitePage[];
  excluded: { title: string; reason: string }[];
  linkGraph: Record<string, string[]>;
}

export const intermediateDataSchema: z.ZodType<IntermediateData> = z.object({
  schemaVersion: z.literal("1"),
  generatedAt: z.string(),
  site: z.object({
    title: z.string(),
    description: z.string().optional(),
    baseUrl: z.string().url(),
    lang: z.string(),
  }),
  pages: z.array(pageSchema),
  excluded: z.array(z.object({ title: z.string(), reason: z.string() })),
  linkGraph: z.record(z.string(), z.array(z.string())),
});
