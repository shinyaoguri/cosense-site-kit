import type { CosenseSiteConfig } from "../config";
import { normalizeKey } from "../keys";
import type { CosenseSitePage } from "../schema/v1/page";

export interface ExcludedPage {
  title: string;
  reason: string;
  /** Page tags at exclusion time — used by doctor to spot orphan posts etc. */
  tags?: string[];
}

export interface PublishDecision {
  kept: CosenseSitePage[];
  excluded: ExcludedPage[];
}

// Return why `page` hits an excludeTag ("#draft" / "[draft]"), or undefined.
// Match case-insensitively: Cosense collapses `#Draft` and `#draft` onto one
// tag page, so a case-variant excludeTag must still exclude — otherwise the
// safety rule "exclude always wins" fails open and leaks the page. Bracket
// links count too: `[draft]` and `#draft` point at the same Cosense page, and
// an author writing either means "draft". Shared with doctor so the leak check
// mirrors the real filter.
export function excludedBy(page: CosenseSitePage, excludeTags: string[]): string | undefined {
  const tags = new Set(page.tags.map(normalizeKey));
  const tag = excludeTags.find((t) => tags.has(normalizeKey(t)));
  if (tag) return `#${tag}`;
  const links = new Set(page.links.map(normalizeKey));
  const link = excludeTags.find((t) => links.has(normalizeKey(t)));
  return link ? `[${link}]` : undefined;
}

// Apply publish rules to a set of normalized pages. Rule order:
//   1. If any excludeTag matches (as #tag or [link]) -> exclude.
//   2. Else if any includeTag matches (as #tag only — a `[publish]` mention
//      must not publish, which would fail open) -> include.
//   3. Else fall back to `publish.default` ("all" or "none").
export function applyPublishRules(
  pages: CosenseSitePage[],
  publish: CosenseSiteConfig["publish"],
): PublishDecision {
  const kept: CosenseSitePage[] = [];
  const excluded: ExcludedPage[] = [];

  for (const page of pages) {
    const excluded_by = excludedBy(page, publish.excludeTags);
    if (excluded_by) {
      excluded.push({
        title: page.title,
        reason: `excluded by tag ${excluded_by}`,
        tags: page.tags,
      });
      continue;
    }
    const tags = new Set(page.tags.map(normalizeKey));
    const included_tag = publish.includeTags.find((t) => tags.has(normalizeKey(t)));
    if (included_tag) {
      kept.push(page);
      continue;
    }
    if (publish.default === "all") {
      kept.push(page);
    } else {
      excluded.push({
        title: page.title,
        reason: `no include tag and default is "none"`,
        tags: page.tags,
      });
    }
  }

  return { kept, excluded };
}
