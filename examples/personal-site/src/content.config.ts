import { defineCollection } from "astro:content";
import { cosenseLoader, cosenseSchema } from "@cosense-site-kit/astro";

const pages = defineCollection({
  loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
  schema: cosenseSchema,
});

export const collections = { pages };
