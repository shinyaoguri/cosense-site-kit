import { z } from "zod";

export const cosenseSiteConfigSchema = z.object({
  site: z.object({
    title: z.string(),
    description: z.string().optional(),
    baseUrl: z.string().url(),
    lang: z.string().default("ja"),
  }),
  source: z.object({
    type: z.literal("cosense"),
    project: z.string().min(1),
  }),
  publish: z
    .object({
      default: z.enum(["all", "none"]).default("none"),
      includeTags: z.array(z.string()).default(["publish"]),
      excludeTags: z.array(z.string()).default(["draft", "private", "internal"]),
    })
    .default({}),
  routing: z
    .object({
      slug: z.enum(["title", "encoded-title", "metadata-or-encoded-title"]).default(
        "metadata-or-encoded-title",
      ),
    })
    .default({}),
  theme: z.unknown().optional(),
  plugins: z.array(z.unknown()).default([]),
  deploy: z
    .object({
      target: z.enum(["cloudflare-workers", "github-pages"]),
      schedule: z.string().optional(),
    })
    .optional(),
});

export type CosenseSiteConfig = z.infer<typeof cosenseSiteConfigSchema>;
export type CosenseSiteConfigInput = z.input<typeof cosenseSiteConfigSchema>;

export function defineCosenseSite(config: CosenseSiteConfigInput): CosenseSiteConfig {
  return cosenseSiteConfigSchema.parse(config);
}
