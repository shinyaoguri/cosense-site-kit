import { parseScrapboxText } from "../../parse/scrapbox";
import { DEFAULT_TEMPLATE } from "../../resolve/template";
import type { CosenseBlock } from "../../schema/v1/block";
import type { InlineNode } from "../../schema/v1/inline";
import type { CosenseSitePage } from "../../schema/v1/page";
import { dedupe } from "../../util/dedupe";
import type { SourcePageRaw } from "../types";

// Convert a raw source page into the intermediate model. Links are populated
// here from the source's `links` field plus any internal pageLinks discovered
// during parse. Slug, backlinks, and pageLink.slug/exists are filled in later
// by the pipeline once the full set of published pages is known.

export function normalizePage(raw: SourcePageRaw, project: string): CosenseSitePage {
  const parsed = parseScrapboxText(raw.text, project);
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
    summary: extractSummary(parsed.blocks) ?? cleanDescription(raw.descriptions),
    // First image in the body becomes the OG/Twitter card image. raw.image
    // (the Cosense-provided thumbnail) is a fallback for pages whose images
    // are all inline-linked rather than parsed as media.
    image: parsed.images[0] ?? raw.image ?? undefined,
    tags: parsed.tags,
    links,
    backlinks: [],
    authors: raw.authors,
    blocks: parsed.blocks,
  };
}

// Find the first paragraph with meaningful text. Tag-only / icon-only lines
// (very common at the top of Cosense pages, e.g. "#publish #post") are
// skipped so the summary surfaces actual content. Returns undefined if no
// paragraph contains visible text.
function extractSummary(blocks: CosenseBlock[]): string | undefined {
  for (const b of blocks) {
    if (b.type !== "paragraph") continue;
    const text = inlineToText(b.children).trim();
    if (text.length === 0) continue;
    return text;
  }
  return undefined;
}

function inlineToText(nodes: InlineNode[]): string {
  let out = "";
  for (const n of nodes) {
    switch (n.type) {
      case "text":
        out += n.value;
        break;
      case "strong":
      case "emphasis":
      case "strikethrough":
      case "link":
        out += inlineToText(n.children);
        break;
      case "code":
      case "formula":
        out += n.value;
        break;
      case "pageLink":
        out += n.title;
        break;
      case "tag":
      case "icon":
        // Skip — these are metadata, not part of the summary.
        break;
    }
  }
  return out;
}

// Cosense API's `descriptions` are the page's body lines (after the title):
// prose, but also tag-only lines and code lines (Cosense wraps every code-block
// / inline-code line in backticks). As a last-resort summary fallback, return
// the first line that is actual prose — skipping tag-only lines and whole-line
// code spans, so a data-only page (e.g. a `#template/collection` page whose body
// is just a YAML block) doesn't surface `` `education:` `` as its summary.
// Returns undefined when no line qualifies.
function cleanDescription(descriptions: string[] | undefined): string | undefined {
  for (const raw of descriptions ?? []) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    // Tag-only line (e.g. "#publish #post") — metadata, not prose.
    if (/^(#\S+\s*)+$/.test(trimmed)) continue;
    // A whole-line code span — Cosense backtick-wraps code-block body lines.
    if (/^`[^`]+`$/.test(trimmed)) continue;
    return trimmed;
  }
  return undefined;
}
