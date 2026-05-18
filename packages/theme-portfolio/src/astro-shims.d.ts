// Ambient declarations so `tsc --noEmit` accepts Astro's virtual modules
// inside theme helper code. Astro's typegen replaces these with real types
// when the theme is consumed inside an Astro project.

/// <reference types="astro/client" />

declare module "astro:content" {
  // Loose data shape for in-repo typecheck. The actual Astro project overrides
  // this with real types generated from content.config.ts.
  export type CollectionEntry<_T extends string = string> = {
    id: string;
    // biome-ignore lint: shim only — Astro's typegen replaces this in consumers
    data: any;
  };
  export function getCollection<T extends string = string>(
    collection: T,
  ): Promise<CollectionEntry<T>[]>;
  export function getEntry<T extends string = string>(
    collection: T,
    id: string,
  ): Promise<CollectionEntry<T> | undefined>;
}
