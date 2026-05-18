import { getCollection, getEntry } from "astro:content";
import {
  emptySiteStructure,
  pathFor,
  type SiteStructure,
} from "@cosense-site-kit/core";
import options from "virtual:cosense-theme-default/options";

// Load the SiteStructure from the "site" collection. Falls back to an empty
// structure if the collection isn't registered or the entry is missing, so
// theme components don't crash on sites that opt out of the .site page.
export async function loadStructure(): Promise<SiteStructure> {
  try {
    const entry = await getEntry("site" as never, "structure" as never);
    const data = (entry as { data?: SiteStructure } | undefined)?.data;
    return data ?? emptySiteStructure();
  } catch {
    return emptySiteStructure();
  }
}

// Page titles inside SiteStructure (nav.page, home.page, featured[]) are
// Cosense titles, not slugs. Build a map so theme components can resolve to
// the correct URL path. We do this once per render at the Astro server.
export async function loadTitleToSlug(): Promise<Map<string, string>> {
  const pages = await getCollection(options.collection as "pages");
  return new Map(pages.map((e: { data: { title: string; slug: string } }) => [e.data.title, e.data.slug]));
}

export function navHref(
  item:
    | { label: string; page: string }
    | { label: string; href: string },
  titleToSlug: Map<string, string>,
): string {
  if ("href" in item) return item.href;
  const slug = titleToSlug.get(item.page);
  return slug ? path(slug) : "#";
}

// pathFor wrapper that automatically prepends Astro's configured base path.
// import.meta.env.BASE_URL is "/" by default and reflects site.base when set.
export function path(slug: string): string {
  return pathFor(slug, import.meta.env.BASE_URL);
}
