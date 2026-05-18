import type { CosenseBlock, InlineNode } from "@cosense-site-kit/core";

export interface CardSummary {
  title: string;
  slug: string;
  description: string;
  date: Date | null;
  image: string | null;
}

function inlineToText(nodes: InlineNode[]): string {
  let out = "";
  for (const n of nodes) {
    switch (n.type) {
      case "text": out += n.value; break;
      case "strong":
      case "emphasis":
      case "strikethrough":
      case "link":
        out += inlineToText(n.children); break;
      case "code":
      case "formula":
        out += n.value; break;
      case "pageLink": out += n.title; break;
      default: break;
    }
  }
  return out;
}

function firstParagraph(blocks: CosenseBlock[]): string {
  for (const b of blocks) {
    if (b.type === "paragraph") {
      const t = inlineToText(b.children).trim();
      if (t.length > 0) return t;
    }
  }
  return "";
}

function firstImage(blocks: CosenseBlock[]): string | null {
  for (const b of blocks) {
    if (b.type === "image") return b.url;
  }
  return null;
}

// Shared summarisation for news / case / service cards. The cards differ
// visually but the data extraction (title, description, first image,
// effective date) is the same.
export function cardSummary(entry: {
  data: {
    title: string;
    slug: string;
    summary?: string;
    blocks: CosenseBlock[];
    createdAt?: string;
    updatedAt?: string;
  };
}): CardSummary {
  return {
    title: entry.data.title,
    slug: entry.data.slug,
    description: entry.data.summary?.trim() || firstParagraph(entry.data.blocks),
    date:
      entry.data.createdAt || entry.data.updatedAt
        ? new Date(entry.data.createdAt ?? entry.data.updatedAt!)
        : null,
    image: firstImage(entry.data.blocks),
  };
}

export function formatYmd(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
