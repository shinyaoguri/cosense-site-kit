import { defineCollection } from "astro:content";
import { cosenseLoader, cosenseSchema } from "@cosense-site-kit/astro";

// theme-portfolio and theme-default consume one Astro content collection:
// `pages`, populated by the cosenseLoader from .cosense-cache/pages/.
//
// The parsed .site SiteStructure is a per-site singleton, not a collection.
// The cosense() integration exposes it via the virtual:cosense-site-kit/
// structure module — themes read it through loadStructure() from
// @cosense-site-kit/theme-utils.

const pages = defineCollection({
  loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
  schema: cosenseSchema,
});

export const collections = { pages };
