import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
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

// Shape check for entries read back from disk. A truncated or hand-edited
// file must register as a cache miss (refetch) — not crash every subsequent
// build until someone deletes the cache by hand.
const cachedPageSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    updated: z.number(),
    created: z.number(),
    text: z.string(),
    links: z.array(z.string()),
    image: z.string().nullable(),
    descriptions: z.array(z.string()),
    sourceUrl: z.string(),
    authors: z.array(z.string()).optional(),
  })
  .loose();

export function createPageCache(cacheDir: string): PageCache {
  return {
    dir: () => cacheDir,

    async get(id) {
      let buf: string;
      try {
        buf = await readFile(pagePath(cacheDir, id), "utf8");
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
      try {
        const parsed = cachedPageSchema.safeParse(JSON.parse(buf));
        return parsed.success ? parsed.data : null;
      } catch {
        // Corrupt JSON (e.g. a write interrupted before the atomic rename
        // existed): treat as a miss so the page is simply refetched.
        return null;
      }
    },

    async set(page) {
      const path = pagePath(cacheDir, page.id);
      await mkdir(dirname(path), { recursive: true });
      // Write-then-rename so an interrupted build can't leave a truncated
      // entry behind (rename within a directory is atomic on POSIX).
      const tmp = `${path}.tmp-${process.pid}`;
      await writeFile(tmp, `${JSON.stringify(page, null, 2)}\n`);
      await rename(tmp, path);
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
