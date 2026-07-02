import { z } from "zod";
import { SAFE_HREF } from "../../url";

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
  | { type: "icon"; pageTitle: string; project: string; src: string; strong?: boolean }
  | { type: "image"; src: string; href?: string; alt?: string };

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
      // Enforce the safe-href invariant the parser is meant to guarantee, so a
      // future parser/source regression that let `javascript:` through is caught
      // at the model boundary instead of reaching `<a href>` in a theme.
      href: z.string().regex(SAFE_HREF),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      type: z.literal("pageLink"),
      title: z.string(),
      slug: z.string().optional(),
      exists: z.boolean(),
    }),
    z.object({ type: z.literal("tag"), name: z.string() }),
    z.object({
      type: z.literal("icon"),
      pageTitle: z.string(),
      project: z.string(),
      src: z.string(),
      // `[[name.icon]]` (strongIcon) — themes render it larger, like Cosense.
      strong: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("image"),
      src: z.string(),
      // The optional link target wrapping the image — same safe-href invariant
      // as `link`. `src` is left unconstrained (image hosts vary; it's not an
      // <a href> and can't execute script).
      href: z.string().regex(SAFE_HREF).optional(),
      alt: z.string().optional(),
    }),
  ]),
);
