// Typecheck-only content config. `astro check` runs `astro sync` here, which
// reads this file to generate high-fidelity `astro:content` types (a real
// DataEntryMap for the `pages` collection) so templates/components are checked
// against the actual page schema instead of `any`. Consumers never load this
// file — Astro only reads the content config of the project being built — and
// the no-op loader keeps `astro sync` from fetching anything.
import { defineCollection } from "astro:content";
import { pageSchema } from "@cosense-site-kit/core";

const pages = defineCollection({
  loader: { name: "cosense-site-kit/typecheck-noop", load: async () => {} },
  schema: pageSchema,
});

export const collections = { pages };
