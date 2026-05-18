/// <reference types="astro/client" />

declare module "astro:content" {
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
