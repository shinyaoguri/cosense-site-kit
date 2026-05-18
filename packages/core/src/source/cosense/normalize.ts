import { parseScrapboxText } from "../../parse/scrapbox";
import { DEFAULT_TEMPLATE } from "../../resolve/template";
import type { CosenseSitePage } from "../../schema/v1/page";
import type { SourcePageRaw } from "../types";

// Convert a raw source page into the intermediate model. Links are populated
// here from the source's `links` field plus any internal pageLinks discovered
// during parse. Slug, backlinks, and pageLink.slug/exists are filled in later
// by the pipeline once the full set of published pages is known.

export function normalizePage(raw: SourcePageRaw): CosenseSitePage {
  const parsed = parseScrapboxText(raw.text);
  const links = dedupe([...raw.links, ...parsed.pageLinks]);

  return {
    schemaVersion: "1",
    id: raw.id,
    title: raw.title,
    slug: "",
    sourceUrl: raw.sourceUrl,
    template: DEFAULT_TEMPLATE,
    createdAt: new Date(raw.created * 1000).toISOString(),
    updatedAt: new Date(raw.updated * 1000).toISOString(),
    summary: raw.descriptions[0],
    tags: parsed.tags,
    links,
    backlinks: [],
    authors: raw.authors,
    blocks: parsed.blocks,
    raw: { text: raw.text },
  };
}

function dedupe<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
