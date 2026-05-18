import type { CosenseBlock } from "@cosense-site-kit/core";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

// ---- Schema ----

const cvSectionKeys = [
  "education",
  "career",
  "publications",
  "awards",
  "researchgrant",
  "works",
  "qualification",
] as const;

export type CvSectionKey = (typeof cvSectionKeys)[number];

const periodItem = z.object({
  period: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
});

const yearItem = z.object({
  year: z.union([z.number(), z.string()]),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
});

const publicationItem = z.object({
  year: z.union([z.number(), z.string()]),
  authors: z.string(),
  title: z.string(),
  source: z.string(),
  url: z.string().optional(),
  peerReviewed: z.boolean().optional(),
  fullPaper: z.boolean().optional(),
});

const qualificationItem = z.object({
  year: z.union([z.number(), z.string()]),
  title: z.string(),
  url: z.string().optional(),
});

export const cvSchema = z
  .object({
    sectionOrder: z.array(z.enum(cvSectionKeys)).optional(),
    education: z.array(periodItem).optional(),
    career: z.array(periodItem).optional(),
    publications: z.array(publicationItem).optional(),
    awards: z.array(yearItem).optional(),
    researchgrant: z.array(yearItem).optional(),
    works: z.array(yearItem).optional(),
    qualification: z.array(qualificationItem).optional(),
  })
  .passthrough();

export type CvData = z.infer<typeof cvSchema>;
export type PeriodItem = z.infer<typeof periodItem>;
export type YearItem = z.infer<typeof yearItem>;
export type PublicationItem = z.infer<typeof publicationItem>;
export type QualificationItem = z.infer<typeof qualificationItem>;

// ---- Extraction ----

// Pulls a `code:cv.yaml` block out of the page body and parses it. The
// convention mirrors `.site` `code:site.yaml`: structured data lives in a
// named code block on the page itself, so authors don't have to leave the
// Cosense editor to maintain CV data.
export function extractCv(blocks: CosenseBlock[]): CvData | null {
  const block = blocks.find(
    (b): b is Extract<CosenseBlock, { type: "code" }> =>
      b.type === "code" && b.filename === "cv.yaml",
  );
  if (!block) return null;
  try {
    const raw = parseYaml(block.value);
    return cvSchema.parse(raw);
  } catch (err) {
    // Swallow and return null so the page falls back to plain Markdown
    // rendering rather than crashing the build. The doctor can surface this
    // as a separate check in the future.
    console.warn(
      `[theme-portfolio] failed to parse code:cv.yaml — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

// ---- Section ordering ----

export const DEFAULT_CV_ORDER: readonly CvSectionKey[] = [
  "education",
  "career",
  "publications",
  "awards",
  "researchgrant",
  "works",
  "qualification",
];

export function effectiveOrder(cv: CvData): readonly CvSectionKey[] {
  return cv.sectionOrder ?? DEFAULT_CV_ORDER;
}

// ---- Inline Markdown link → HTML conversion ----

// CV row text often contains `[label](url)` from authors used to Markdown.
// Convert minimally to HTML so `set:html` can render external links without
// pulling in a full Markdown processor. Escapes everything else.

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}

export function renderInlineLinks(text: string | undefined): string {
  if (!text) return "";
  // Tokenize: split on the link pattern, escape the literal parts, and
  // render the link parts as <a target="_blank">.
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let out = "";
  let lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    out += escapeHtml(text.slice(lastIndex, start));
    const [, label = "", href = ""] = m;
    out += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    lastIndex = start + m[0].length;
  }
  out += escapeHtml(text.slice(lastIndex));
  return out;
}
