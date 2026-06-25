import type { SiteSource, SourcePageRaw, SourcePageRef } from "../types";
import { CosenseApi, CosenseApiError } from "./api";
import { createPageCache, type PageCache } from "./cache";

export interface CosenseSourceOptions {
  project: string;
  /** Optional API customization. */
  api?: { baseUrl?: string; timeoutMs?: number; userAgent?: string };
  /** Where to persist incremental cache. Default: .cosense-cache */
  cacheDir?: string;
  /** If true, ignore cache and refetch all pages. */
  force?: boolean;
}

export function createCosenseSource(opts: CosenseSourceOptions): SiteSource & {
  cache: PageCache;
} {
  const api = new CosenseApi(opts.api);
  const cache = createPageCache(opts.cacheDir ?? ".cosense-cache");
  const project = opts.project;
  const force = opts.force ?? false;

  return {
    name: "cosense",
    cache,

    async list({ signal } = {}) {
      const refs: SourcePageRef[] = [];
      for await (const p of api.listAllPages(project, signal)) {
        refs.push({
          id: p.id,
          title: p.title,
          updated: p.updated,
          sourceUrl: pageUrl(project, p.title),
        });
      }
      return refs;
    },

    async siteIcon({ signal, onWarn } = {}) {
      try {
        const info = await api.getProject(project, signal);
        return info.image ?? null;
      } catch (err) {
        // A cancelled build must abort, never degrade.
        if (signal?.aborted) throw err;
        // The project icon is a best-effort default — a 404 (private project,
        // no API access) or a transient failure must not break the build.
        const msg = err instanceof Error ? err.message : String(err);
        onWarn?.(`could not fetch the Cosense project icon (${msg}); skipping it as a favicon`);
        return null;
      }
    },

    async fetch(ref, { signal, onWarn } = {}) {
      if (!force) {
        const cached = await cache.get(ref.id);
        if (cached && cached.updated >= ref.updated) return cached;
      }
      let page: Awaited<ReturnType<CosenseApi["getPage"]>>;
      try {
        page = await api.getPage(project, ref.title, signal);
      } catch (err) {
        // A cancelled build must abort, never degrade.
        if (signal?.aborted) throw err;
        if (err instanceof CosenseApiError && err.status === 404) {
          // Deleted between list and fetch. Skip it — serving a stale cached
          // copy here would resurrect a page the author removed.
          onWarn?.(`page "${ref.title}" disappeared between list and fetch (404); skipped`);
          return null;
        }
        // Transient failure (network, 5xx after retries, rate limit): a stale
        // cached copy keeps the scheduled unattended build alive.
        const stale = await cache.get(ref.id);
        if (stale) {
          const msg = err instanceof Error ? err.message : String(err);
          onWarn?.(`fetch failed for "${ref.title}" (${msg}); using the cached copy`);
          return stale;
        }
        throw err;
      }
      const raw: SourcePageRaw = {
        id: page.id,
        title: page.title,
        updated: page.updated,
        created: page.created,
        text: page.lines.map((l) => l.text).join("\n"),
        links: page.links ?? [],
        image: page.image ?? null,
        descriptions: page.descriptions ?? [],
        sourceUrl: pageUrl(project, page.title),
        authors: collectAuthors(page),
      };
      await cache.set(raw);
      return raw;
    },
  };
}

function pageUrl(project: string, title: string): string {
  return `https://scrapbox.io/${encodeURIComponent(project)}/${encodeURIComponent(title)}`;
}

function collectAuthors(page: {
  user?: { displayName?: string; name?: string };
  lastUpdateUser?: { displayName?: string; name?: string };
  collaborators?: { displayName?: string; name?: string }[];
}): string[] | undefined {
  const out = new Set<string>();
  const name = (u?: { displayName?: string; name?: string }) =>
    u?.displayName || u?.name || undefined;
  const a = name(page.user);
  if (a) out.add(a);
  const b = name(page.lastUpdateUser);
  if (b) out.add(b);
  for (const c of page.collaborators ?? []) {
    const n = name(c);
    if (n) out.add(n);
  }
  return out.size > 0 ? Array.from(out) : undefined;
}
