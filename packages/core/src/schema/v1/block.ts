import { z } from "zod";
import { type InlineNode, inlineNodeSchema } from "./inline";

export type CosenseBlock =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "heading"; depth: 1 | 2 | 3; children: InlineNode[] }
  | { type: "quote"; children: InlineNode[] }
  | { type: "list"; depth: number; ordered?: boolean; children: InlineNode[] }
  | { type: "code"; filename?: string; lang?: string; value: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "embed"; kind: "gyazo" | "youtube" | "link" | "unknown"; url: string }
  | { type: "table"; filename?: string; rows: string[][] }
  | { type: "raw"; value: string };

export const blockSchema: z.ZodType<CosenseBlock> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), children: z.array(inlineNodeSchema) }),
  z.object({
    type: z.literal("heading"),
    depth: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    children: z.array(inlineNodeSchema),
  }),
  z.object({ type: z.literal("quote"), children: z.array(inlineNodeSchema) }),
  z.object({
    type: z.literal("list"),
    depth: z.number().int().min(0),
    ordered: z.boolean().optional(),
    children: z.array(inlineNodeSchema),
  }),
  z.object({
    type: z.literal("code"),
    filename: z.string().optional(),
    lang: z.string().optional(),
    value: z.string(),
  }),
  z.object({ type: z.literal("image"), url: z.string(), alt: z.string().optional() }),
  z.object({
    type: z.literal("embed"),
    kind: z.enum(["gyazo", "youtube", "link", "unknown"]),
    url: z.string(),
  }),
  z.object({
    type: z.literal("table"),
    filename: z.string().optional(),
    rows: z.array(z.array(z.string())),
  }),
  z.object({ type: z.literal("raw"), value: z.string() }),
]);
