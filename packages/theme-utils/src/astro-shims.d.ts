// In-repo typecheck shims. Astro's own typegen replaces these inside an
// actual Astro project.

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
