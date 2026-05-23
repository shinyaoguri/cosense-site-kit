import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CosenseSiteConfig } from "./config";
import { parseSitePage, SiteConfigParseError } from "./parse/site-config";
import { applyPublishRules } from "./publish/filter";
import { resolveLinkData } from "./resolve/backlinks";
import { assignDates } from "./resolve/dates";
import { buildTitleToSlug, resolveInternalLinks } from "./resolve/links";
import { assignSlugs } from "./resolve/slug";
import { assignTemplates } from "./resolve/template";
import { type IntermediateData, intermediateDataSchema } from "./schema/v1/page";
import { emptySiteStructure, type SiteStructure } from "./schema/v1/site-structure";
import { type CosenseSourceOptions, createCosenseSource } from "./source/cosense";
import { normalizePage } from "./source/cosense/normalize";
import type { SiteSource, SourcePageRaw } from "./source/types";

export interface BuildIntermediateOptions {
  config: CosenseSiteConfig;
  cacheDir?: string;
  force?: boolean;
  signal?: AbortSignal;
  /** Override the source. Useful for tests. */
  source?: SiteSource;
  /** Notifier for progress; optional. */
  onProgress?: (event: ProgressEvent) => void;
  /** Concurrency for fetching individual pages. Default 4. */
  concurrency?: number;
  /**
   * Include pages that the publish rules would exclude (drafts, not-yet-
   * published), marked `draft: true`, so they're viewable in a local preview.
   * Set only by the dev server — never in a production build, so drafts can't
   * leak. They still appear in `excluded` for doctor.
   */
  previewDrafts?: boolean;
}

export type ProgressEvent =
  | { kind: "list"; total: number }
  | { kind: "fetch"; current: number; total: number; title: string }
  | { kind: "normalize"; total: number }
  | { kind: "publish"; kept: number; excluded: number }
  | { kind: "site-config"; found: boolean; warnings: string[] }
  | { kind: "warn"; message: string };

export async function buildIntermediate(opts: BuildIntermediateOptions): Promise<IntermediateData> {
  const { config, signal } = opts;
  const source = opts.source ?? defaultSource(config, opts);
  const concurrency = Math.max(1, opts.concurrency ?? 4);

  const refs = await source.list({ signal });
  opts.onProgress?.({ kind: "list", total: refs.length });

  const raws: SourcePageRaw[] = [];
  let done = 0;
  for (let i = 0; i < refs.length; i += concurrency) {
    const batch = refs.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (ref) => {
        const raw = await source.fetch(ref, { signal });
        done++;
        opts.onProgress?.({
          kind: "fetch",
          current: done,
          total: refs.length,
          title: ref.title,
        });
        return raw;
      }),
    );
    raws.push(...results);
  }

  const normalized = raws.map((raw) => normalizePage(raw, config.source.project));
  opts.onProgress?.({ kind: "normalize", total: normalized.length });

  // Separate the site-config page (if any) before the publish filter. It is
  // meta-data, never rendered as a route, and must not be dropped just because
  // it lacks a #publish tag.
  const { structure, warnings, sitePageTitle } = extractStructure(
    normalized,
    config.siteConfig.page,
    opts.onProgress,
  );
  const remainingPages = sitePageTitle
    ? normalized.filter((p) => p.title !== sitePageTitle)
    : normalized;

  const { kept, excluded } = applyPublishRules(remainingPages, config.publish);
  if (sitePageTitle && normalized.some((p) => p.title === sitePageTitle)) {
    excluded.push({ title: sitePageTitle, reason: "site-config page" });
  }
  opts.onProgress?.({ kind: "publish", kept: kept.length, excluded: excluded.length });

  // Dev preview: also render the tag-excluded pages (drafts / not-yet-published),
  // flagged so the theme can badge them. They stay listed in `excluded` too.
  const draftPages = opts.previewDrafts
    ? remainingPages.filter((p) => !kept.includes(p)).map((p) => ({ ...p, draft: true }))
    : [];
  const published = draftPages.length > 0 ? [...kept, ...draftPages] : kept;

  const slugged = assignSlugs(published, config.routing);

  const titleToSlug = buildTitleToSlug(slugged);
  const linked = resolveInternalLinks(slugged, titleToSlug);
  const { pages: withBacklinks, linkGraph } = resolveLinkData(linked, titleToSlug);
  const withTemplates = assignTemplates(withBacklinks, structure);
  const { pages: withDates, warnings: dateWarnings } = assignDates(withTemplates);
  for (const w of dateWarnings) opts.onProgress?.({ kind: "warn", message: w });

  const data: IntermediateData = {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    site: { ...config.site, icon: pickFavicon(raws, structure.home?.page) },
    pages: withDates,
    excluded,
    linkGraph,
    structure,
    warnings: [...warnings, ...dateWarnings],
  };

  return intermediateDataSchema.parse(data);
}

// Cosense uses the project's first page's icon as the favicon. We mirror that:
// prefer the configured home page's image, otherwise the first source-listed
// page that actually has one (`raws` preserves the source list order). Returns
// undefined when no candidate has an image.
function pickFavicon(raws: SourcePageRaw[], homePage: string | undefined): string | undefined {
  if (homePage) {
    const home = raws.find((r) => r.title === homePage);
    if (home?.image) return home.image;
  }
  return raws.find((r) => r.image)?.image ?? undefined;
}

function extractStructure(
  normalized: ReturnType<typeof normalizePage>[],
  sitePage: string | null,
  onProgress: BuildIntermediateOptions["onProgress"],
): { structure: SiteStructure; warnings: string[]; sitePageTitle: string | null } {
  if (!sitePage) {
    return { structure: emptySiteStructure(), warnings: [], sitePageTitle: null };
  }
  const page = normalized.find((p) => p.title === sitePage);
  if (!page) {
    onProgress?.({ kind: "site-config", found: false, warnings: [] });
    return { structure: emptySiteStructure(), warnings: [], sitePageTitle: sitePage };
  }
  try {
    const result = parseSitePage(page);
    const structure = result?.structure ?? emptySiteStructure();
    const warnings = result?.warnings ?? [];
    onProgress?.({ kind: "site-config", found: result !== null, warnings });
    for (const w of warnings) onProgress?.({ kind: "warn", message: w });
    return { structure, warnings, sitePageTitle: sitePage };
  } catch (err) {
    if (err instanceof SiteConfigParseError) {
      const message = err.message;
      onProgress?.({ kind: "warn", message });
      return {
        structure: emptySiteStructure(),
        warnings: [message],
        sitePageTitle: sitePage,
      };
    }
    throw err;
  }
}

function defaultSource(config: CosenseSiteConfig, opts: BuildIntermediateOptions): SiteSource {
  const sourceOpts: CosenseSourceOptions = {
    project: config.source.project,
    cacheDir: opts.cacheDir,
    force: opts.force,
  };
  return createCosenseSource(sourceOpts);
}

export async function writeIntermediate(data: IntermediateData, outFile: string): Promise<void> {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(data, null, 2)}\n`);
}
