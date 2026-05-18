import type { CosenseSitePage } from "../schema/v1/page";
import type { SiteStructure } from "../schema/v1/site-structure";

export const DEFAULT_TEMPLATE = "page";
const TEMPLATE_TAG_PREFIX = "template/";

// Pick the template name for a single page. Priority (high → low):
//   1. `#template/<name>` tag on the page
//   2. structure.templates[page.title] (sitewide mapping in .site YAML)
//   3. DEFAULT_TEMPLATE
export function resolveTemplate(
  page: CosenseSitePage,
  structure: SiteStructure,
): string {
  const tag = page.tags.find((t) => t.startsWith(TEMPLATE_TAG_PREFIX));
  if (tag) {
    const name = tag.slice(TEMPLATE_TAG_PREFIX.length);
    if (name) return name;
  }
  const mapped = structure.templates[page.title];
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
