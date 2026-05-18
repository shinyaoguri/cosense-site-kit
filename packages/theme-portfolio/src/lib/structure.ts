import { getCollection, getEntry } from "astro:content";
import {
  emptySiteStructure,
  pathFor,
  type SiteStructure,
} from "@cosense-site-kit/core";
import options from "virtual:cosense-theme-portfolio/options";

export async function loadStructure(): Promise<SiteStructure> {
  try {
    const entry = await getEntry("site" as never, "structure" as never);
    const data = (entry as { data?: SiteStructure } | undefined)?.data;
    return data ?? emptySiteStructure();
  } catch {
    return emptySiteStructure();
  }
}

export async function loadTitleToSlug(): Promise<Map<string, string>> {
  const pages = await getCollection(options.collection as "pages");
  return new Map(
    pages.map((e: { data: { title: string; slug: string } }) => [
      e.data.title,
      e.data.slug,
    ]),
  );
}

export function navHref(
  item:
    | { label: string; page: string }
    | { label: string; href: string }
    | { label: string; page?: string; href?: string },
  titleToSlug: Map<string, string>,
): string {
  if ("href" in item && item.href) return item.href;
  if ("page" in item && item.page) {
    const slug = titleToSlug.get(item.page);
    return slug ? path(slug) : "#";
  }
  return "#";
}

export function path(slug: string): string {
  return pathFor(slug, import.meta.env.BASE_URL);
}

export function isPublicTag(name: string): boolean {
  return !name.includes("/");
}
