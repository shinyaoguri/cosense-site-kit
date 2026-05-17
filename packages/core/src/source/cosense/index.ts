import { CosenseApi } from "./api";
import { createPageCache, type PageCache } from "./cache";
import type {
  SiteSource,
  SourcePageRaw,
  SourcePageRef,
} from "../types";

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

    async fetch(ref, { signal } = {}) {
      if (!force) {
        const cached = await cache.get(ref.id);
        if (cached && cached.updated >= ref.updated) return cached;
      }
      const page = await api.getPage(project, ref.title, signal);
      const raw: SourcePageRaw = {
        id: page.id,
        title: page.title,
        updated: page.updated,
        created: page.created,
        text: page.lines.map((l) => l.text).join("\n"),
        links: page.links ?? [],
        image: page.image,
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
