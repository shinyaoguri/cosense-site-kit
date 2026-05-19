import { defineCollection } from "astro:content";
import { cosenseLoader, cosenseSchema } from "@cosense-site-kit/astro";

// Themes consume a single Astro content collection — `pages` — populated by
// cosenseLoader from .cosense-cache/pages/.
//
// SiteStructure (parsed from the .site page) is a per-site singleton, not a
// collection. The cosense() integration exposes it through the virtual
// module virtual:cosense-site-kit/structure; themes read it via
// loadStructure() from @cosense-site-kit/theme-utils.

const pages = defineCollection({
  loader: cosenseLoader({ configFile: "./cosense.config.ts" }),
  schema: cosenseSchema,
});

export const collections = { pages };
