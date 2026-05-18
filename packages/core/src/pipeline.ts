import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { CosenseSiteConfig } from "./config";
import { parseSitePage, SiteConfigParseError } from "./parse/site-config";
import { applyPublishRules } from "./publish/filter";
import { resolveLinkData } from "./resolve/backlinks";
import { buildTitleToSlug, resolveInternalLinks } from "./resolve/links";
import { assignSlugs } from "./resolve/slug";
import { assignTemplates } from "./resolve/template";
import { intermediateDataSchema, type IntermediateData } from "./schema/v1/page";
import { emptySiteStructure, type SiteStructure } from "./schema/v1/site-structure";
import { createCosenseSource, type CosenseSourceOptions } from "./source/cosense";
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
}

export type ProgressEvent =
  | { kind: "list"; total: number }
  | { kind: "fetch"; current: number; total: number; title: string }
  | { kind: "normalize"; total: number }
  | { kind: "publish"; kept: number; excluded: number }
  | { kind: "site-config"; found: boolean; warnings: string[] }
  | { kind: "warn"; message: string };

export async function buildIntermediate(
  opts: BuildIntermediateOptions,
): Promise<IntermediateData> {
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

  const normalized = raws.map(normalizePage);
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

  const slugged = assignSlugs(kept, config.routing);
  const titleToSlug = buildTitleToSlug(slugged);
  const linked = resolveInternalLinks(slugged, titleToSlug);
  const { pages: withBacklinks, linkGraph } = resolveLinkData(linked, titleToSlug);
  const withTemplates = assignTemplates(withBacklinks, structure);

  const data: IntermediateData = {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    site: config.site,
    pages: withTemplates,
    excluded,
    linkGraph,
    structure,
    warnings,
  };

  return intermediateDataSchema.parse(data);
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

function defaultSource(
  config: CosenseSiteConfig,
  opts: BuildIntermediateOptions,
): SiteSource {
  const sourceOpts: CosenseSourceOptions = {
    project: config.source.project,
    cacheDir: opts.cacheDir,
    force: opts.force,
  };
  return createCosenseSource(sourceOpts);
}

export async function writeIntermediate(
  data: IntermediateData,
  outFile: string,
): Promise<void> {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(data, null, 2)}\n`);
}
