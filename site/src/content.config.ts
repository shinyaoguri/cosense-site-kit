import { defineCollection } from "astro:content";
import {
  cosenseLoader,
  cosenseSchema,
  cosenseSiteLoader,
  cosenseSiteSchema,
} from "@cosense-site-kit/astro";

const pages = defineCollection({
  loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
  schema: cosenseSchema,
});

const site = defineCollection({
  loader: cosenseSiteLoader({ configFile: "./cosense.config.ts" }),
  schema: cosenseSiteSchema,
});

export const collections = { pages, site };
