// Ambient declarations so `tsc --noEmit` accepts Astro's virtual modules
// inside theme helper code. Astro's typegen replaces these with real types
// when the theme is consumed inside an Astro project.

/// <reference types="astro/client" />

declare module "astro:content" {
  export type CollectionEntry<_T extends string = string> = {
    id: string;
    data: Record<string, unknown> & { title: string; slug: string };
  };
  export function getCollection<T extends string = string>(
    collection: T,
  ): Promise<CollectionEntry<T>[]>;
  export function getEntry<T extends string = string>(
    collection: T,
    id: string,
  ): Promise<CollectionEntry<T> | undefined>;
}
