import { normalizeKey } from "../keys";
import type { CosenseSitePage } from "../schema/v1/page";
import type { SiteStructure } from "../schema/v1/site-structure";

export const DEFAULT_TEMPLATE = "page";
const TEMPLATE_TAG_PREFIX = "template/";

// Pick the template name for a single page. Priority (high → low):
//   1. `#template/<name>` tag on the page
//   2. structure.templates[page.title] (sitewide mapping in .site YAML)
//   3. DEFAULT_TEMPLATE
export function resolveTemplate(page: CosenseSitePage, structure: SiteStructure): string {
  const tag = page.tags.find((t) => normalizeKey(t).startsWith(TEMPLATE_TAG_PREFIX));
  if (tag) {
    const name = tag.slice(TEMPLATE_TAG_PREFIX.length);
    if (name) return name;
  }
  // The `.site` templates: mapping is keyed by page title; match it
  // case-insensitively (and only against own keys) the same way Cosense
  // resolves titles, so `templates: { Home: ... }` still hits the page "home".
  const title = normalizeKey(page.title);
  const mapped = Object.entries(structure.templates).find(([k]) => normalizeKey(k) === title)?.[1];
  if (mapped) return mapped;
  return DEFAULT_TEMPLATE;
}

// Assign templates to every page in the set, returning a new array.
export function assignTemplates(
  pages: CosenseSitePage[],
  structure: SiteStructure,
): CosenseSitePage[] {
  return pages.map((page) => ({
    ...page,
    template: resolveTemplate(page, structure),
  }));
}
