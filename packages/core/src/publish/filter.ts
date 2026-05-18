import type { CosenseSitePage } from "../schema/v1/page";
import type { CosenseSiteConfig } from "../config";

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

// Apply publish rules to a set of normalized pages. Rule order:
//   1. If any excludeTag matches -> exclude.
//   2. Else if any includeTag matches -> include.
//   3. Else fall back to `publish.default` ("all" or "none").
export function applyPublishRules(
  pages: CosenseSitePage[],
  publish: CosenseSiteConfig["publish"],
): PublishDecision {
  const kept: CosenseSitePage[] = [];
  const excluded: ExcludedPage[] = [];

  for (const page of pages) {
    const tags = new Set(page.tags);
    const excluded_tag = publish.excludeTags.find((t) => tags.has(t));
    if (excluded_tag) {
      excluded.push({
        title: page.title,
        reason: `excluded by tag #${excluded_tag}`,
        tags: page.tags,
      });
      continue;
    }
    const included_tag = publish.includeTags.find((t) => tags.has(t));
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
