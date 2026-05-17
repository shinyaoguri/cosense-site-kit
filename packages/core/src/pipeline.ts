import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { CosenseSiteConfig } from "./config";
import { applyPublishRules } from "./publish/filter";
import { buildLinkGraph, computeBacklinks } from "./resolve/backlinks";
import { resolveInternalLinks } from "./resolve/links";
import { assignSlugs } from "./resolve/slug";
import { intermediateDataSchema, type IntermediateData } from "./schema/v1/page";
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
  | { kind: "publish"; kept: number; excluded: number };

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

  const { kept, excluded } = applyPublishRules(normalized, config.publish);
  opts.onProgress?.({ kind: "publish", kept: kept.length, excluded: excluded.length });

  const slugged = assignSlugs(kept, config.routing);
  const linked = resolveInternalLinks(slugged);
  const withBacklinks = computeBacklinks(linked);
  const linkGraph = buildLinkGraph(withBacklinks);

  const data: IntermediateData = {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    site: config.site,
    pages: withBacklinks,
    excluded,
    linkGraph,
  };

  return intermediateDataSchema.parse(data);
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
