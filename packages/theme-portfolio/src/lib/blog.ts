import type { CosenseBlock, InlineNode } from "@cosense-site-kit/core";

export interface BlogPostSummary {
  title: string;
  slug: string;
  description: string;
  image: string | null;
  date: Date | null;
}

// Walk a block's inline children and concatenate visible text. Used to
// extract a card description out of the first paragraph of a post when the
// pipeline didn't compute a `summary` (or operators want to override it).
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
      case "icon":
        // skip — icons don't carry useful text for a description
        break;
      default:
        break;
    }
  }
  return out;
}

// Find the first image URL embedded in the post body. Used as the card
// thumbnail; falls back to `null` and the card displays a text placeholder.
function firstImage(blocks: CosenseBlock[]): string | null {
  for (const b of blocks) {
    if (b.type === "image") return b.url;
  }
  return null;
}

// First non-empty paragraph as a one-line description.
function firstParagraph(blocks: CosenseBlock[]): string {
  for (const b of blocks) {
    if (b.type === "paragraph") {
      const txt = inlineToText(b.children).trim();
      if (txt.length > 0) return txt;
    }
  }
  return "";
}

export function postSummary(entry: {
  data: {
    title: string;
    slug: string;
    summary?: string;
    blocks: CosenseBlock[];
    createdAt?: string;
    updatedAt?: string;
  };
}): BlogPostSummary {
  const { data } = entry;
  const description = data.summary?.trim() || firstParagraph(data.blocks);
  // Prefer createdAt for "blog date" ordering (more meaningful for posts);
  // fall back to updatedAt so feeds still sort cleanly for legacy data.
  const isoDate = data.createdAt ?? data.updatedAt ?? null;
  return {
    title: data.title,
    slug: data.slug,
    description,
    image: firstImage(data.blocks),
    date: isoDate ? new Date(isoDate) : null,
  };
}

export function formatPostDate(date: Date | null): string {
  if (!date) return "";
  // Match shinyaoguri.com's "YYYY/MM/DD" Japanese locale rendering.
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
