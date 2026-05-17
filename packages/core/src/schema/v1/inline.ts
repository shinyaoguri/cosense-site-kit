import { z } from "zod";

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "strikethrough"; children: InlineNode[] }
  | { type: "code"; value: string }
  | { type: "formula"; value: string }
  | { type: "link"; href: string; children: InlineNode[] }
  | { type: "pageLink"; title: string; slug?: string; exists: boolean }
  | { type: "tag"; name: string }
  | { type: "icon"; pageTitle: string };

export const inlineNodeSchema: z.ZodType<InlineNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({ type: z.literal("strong"), children: z.array(inlineNodeSchema) }),
    z.object({ type: z.literal("emphasis"), children: z.array(inlineNodeSchema) }),
    z.object({ type: z.literal("strikethrough"), children: z.array(inlineNodeSchema) }),
    z.object({ type: z.literal("code"), value: z.string() }),
    z.object({ type: z.literal("formula"), value: z.string() }),
    z.object({
      type: z.literal("link"),
      href: z.string(),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      type: z.literal("pageLink"),
      title: z.string(),
      slug: z.string().optional(),
      exists: z.boolean(),
    }),
    z.object({ type: z.literal("tag"), name: z.string() }),
    z.object({ type: z.literal("icon"), pageTitle: z.string() }),
  ]),
);
