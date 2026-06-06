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
  | { type: "table"; filename?: string; rows: InlineNode[][][] }
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
    // rows[r][c] is a cell; a cell is an InlineNode[] (rich content).
    rows: z.array(z.array(z.array(inlineNodeSchema))),
  }),
  z.object({ type: z.literal("raw"), value: z.string() }),
]);

// Apply `fn` to every top-level inline node a block contains, returning a new
// block of the same shape. Blocks with inline children (paragraph, heading,
// quote, list) map their `children`; table maps every cell in `rows`. Blocks
// with no inline content (code, image, embed, raw) are returned unchanged.
// `fn` only sees the top-level nodes — callers that must recurse into nested
// inline children (strong/link/…) do so inside `fn`. Centralizing the block
// shapes here keeps link resolution, icon vendoring and doctor in lockstep:
// none of them can silently forget a container (quote and table cells were
// previously missed).
export function mapBlockInlines(
  block: CosenseBlock,
  fn: (node: InlineNode) => InlineNode,
): CosenseBlock {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "list":
      return { ...block, children: block.children.map(fn) };
    case "table":
      return { ...block, rows: block.rows.map((row) => row.map((cell) => cell.map(fn))) };
    default:
      return block;
  }
}

// Read-only counterpart of mapBlockInlines: visit every top-level inline node a
// block contains. Same block coverage; `fn` recurses into nested children.
export function forEachBlockInline(block: CosenseBlock, fn: (node: InlineNode) => void): void {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "list":
      for (const node of block.children) fn(node);
      return;
    case "table":
      for (const row of block.rows) for (const cell of row) for (const node of cell) fn(node);
      return;
  }
}
