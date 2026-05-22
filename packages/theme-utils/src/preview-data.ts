// Link-preview data: a compact slug → {title, summary, image} map a theme can
// ship as a small JSON endpoint and fetch lazily to render hover/focus preview
// cards over internal links (the Scrapbox/Obsidian-Publish "popover" feel).
// Pure so the endpoint stays a thin wrapper and the shaping is unit-tested.

export interface PreviewSource {
  slug: string;
  title: string;
  summary?: string;
  image?: string;
}

export interface PagePreview {
  title: string;
  summary?: string;
  image?: string;
}

// Truncate at a word boundary near `max`, adding an ellipsis, so preview cards
// stay short. Summaries are whole first paragraphs and can be long.
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  // Only break on a space when it's not pathologically early (keeps CJK, which
  // has no spaces, from being cut to almost nothing).
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

export function buildPreviewData(
  pages: PreviewSource[],
  opts: { maxSummary?: number } = {},
): Record<string, PagePreview> {
  const max = opts.maxSummary ?? 200;
  const out: Record<string, PagePreview> = {};
  for (const p of pages) {
    out[p.slug] = {
      title: p.title,
      ...(p.summary ? { summary: clip(p.summary, max) } : {}),
      ...(p.image ? { image: p.image } : {}),
    };
  }
  return out;
}
