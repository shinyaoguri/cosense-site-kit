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
  if ("href" in item && item.href) {
    // Site-relative paths (e.g. "/blog", "/tags/foo") need the configured
    // base prefix; absolute URLs and protocol-only links pass through.
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

export function path(slug: string): string {
  return pathFor(slug, import.meta.env.BASE_URL);
}

// Tags used by the framework's publish rules (cosense.config defaults). They
// live in the page body for filtering and have no value as browseable
// categories, so the theme hides them rather than rendering chips for them.
const HIDDEN_CONTROL_TAGS = new Set(["publish", "draft", "private", "internal"]);

export function isPublicTag(name: string): boolean {
  return !name.includes("/") && !HIDDEN_CONTROL_TAGS.has(name);
}

// Returns true when the tag should be omitted from inline rendering
// entirely (no chip, no text). Used to keep control tags from leaking into
// the visible content area.
export function isHiddenTag(name: string): boolean {
  return HIDDEN_CONTROL_TAGS.has(name);
}
