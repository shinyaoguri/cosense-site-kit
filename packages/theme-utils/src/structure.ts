import { getCollection, getEntry } from "astro:content";
import {
  emptySiteStructure,
  pathFor,
  type SiteStructure,
} from "@cosense-site-kit/core";

// Name of the Astro content collection that the cosense() integration's
// pages loader populates. Hardcoded across themes; if a theme wants a
// different collection name, it can build its own helpers.
const PAGES_COLLECTION = "pages";

// Load the SiteStructure published by cosense-site-kit. Falls back to an
// empty structure (no nav, no posts, no templates) when the entry is
// missing, so theme components don't crash on sites that opt out of the
// site-config page.
export async function loadStructure(): Promise<SiteStructure> {
  try {
    const entry = await getEntry("site" as never, "structure" as never);
    const data = (entry as { data?: SiteStructure } | undefined)?.data;
    return data ?? emptySiteStructure();
  } catch {
    return emptySiteStructure();
  }
}

// Build a Cosense-title → URL-slug map from the `pages` collection. Themes
// use this to resolve nav items / featured references (which carry Cosense
// titles) to actual URLs at render time.
export async function loadTitleToSlug(): Promise<Map<string, string>> {
  const pages = await getCollection(PAGES_COLLECTION as never);
  return new Map(
    (pages as { data: { title: string; slug: string } }[]).map((e) => [
      e.data.title,
      e.data.slug,
    ]),
  );
}

// Resolve a nav item to an href. Three shapes:
//   { label, page }: resolve via Cosense title → published slug
//   { label, href: "https://..." }: pass through unchanged
//   { label, href: "/blog" }:        prefix the configured Astro base
export function navHref(
  item:
    | { label: string; page: string }
    | { label: string; href: string }
    | { label: string; page?: string; href?: string },
  titleToSlug: Map<string, string>,
): string {
  if ("href" in item && item.href) {
    if (item.href.startsWith("/")) {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      return `${base}${item.href}`;
    }
    return item.href;
  }
  if ("page" in item && item.page) {
    const slug = titleToSlug.get(item.page);
    return slug ? path(slug) : "#";
  }
  return "#";
}

// pathFor wrapper that automatically prepends Astro's configured base path.
// import.meta.env.BASE_URL is "/" by default and reflects site.base when set.
export function path(slug: string): string {
  return pathFor(slug, import.meta.env.BASE_URL);
}
