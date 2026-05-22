import { getCollection } from "astro:content";
import type { CosenseSitePage } from "@cosense-site-kit/core";
import { buildPreviewData, type PreviewSource } from "@cosense-site-kit/theme-utils";

// /link-previews.json — a compact slug → {title, summary, image} map fetched
// lazily by the LinkPreview client to render hover/focus cards over internal
// links. Kept small (clipped summaries) so it's cheap to load once per visit.
export async function GET(): Promise<Response> {
  // getCollection is untyped under tsc (real types come from `astro sync`).
  const pages = (await getCollection("pages")) as { data: CosenseSitePage }[];
  const sources: PreviewSource[] = pages.map((e) => ({
    slug: e.data.slug,
    title: e.data.title,
    summary: e.data.summary,
    image: e.data.image,
  }));
  return new Response(JSON.stringify(buildPreviewData(sources)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
