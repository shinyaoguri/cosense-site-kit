import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SourcePageRaw } from "../types";

// File-backed cache for fetched pages. Keyed by Cosense page id so renames
// are still hits. Each entry stores its `updated` timestamp so an incremental
// fetch can compare against the list endpoint.
//
// CI restores .cosense-cache/ between runs via actions/cache, and a build
// can fall back to the cache when the API is unavailable.

export interface PageCache {
  get(id: string): Promise<SourcePageRaw | null>;
  set(page: SourcePageRaw): Promise<void>;
  dir(): string;
}

export function createPageCache(cacheDir: string): PageCache {
  return {
    dir: () => cacheDir,

    async get(id) {
      try {
        const buf = await readFile(pagePath(cacheDir, id), "utf8");
        return JSON.parse(buf) as SourcePageRaw;
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },

    async set(page) {
      const path = pagePath(cacheDir, page.id);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(page, null, 2)}\n`);
    },
  };
}

function pagePath(dir: string, id: string): string {
  // Shard by first two chars of id to keep directories small.
  const shard = id.slice(0, 2) || "_";
  return join(dir, "pages", shard, `${id}.json`);
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}
