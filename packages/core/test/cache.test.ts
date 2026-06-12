import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPageCache } from "../src/source/cosense/cache";
import type { SourcePageRaw } from "../src/source/types";

function rawPage(id: string, title: string): SourcePageRaw {
  return {
    id,
    title,
    updated: 1_700_000_000,
    created: 1_600_000_000,
    text: `${title}\nbody`,
    links: [],
    image: null,
    descriptions: [],
    sourceUrl: `https://scrapbox.io/proj/${title}`,
  };
}

describe("createPageCache", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "cosense-cache-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns null when the page is not cached", async () => {
    const cache = createPageCache(dir);
    expect(await cache.get("missing")).toBeNull();
  });

  it("round-trips a page through set/get", async () => {
    const cache = createPageCache(dir);
    const page = rawPage("abc123", "Hello");
    await cache.set(page);
    expect(await cache.get("abc123")).toEqual(page);
  });

  it("shards by the first two id characters", async () => {
    const cache = createPageCache(dir);
    await cache.set(rawPage("abcde", "A"));
    // Read the file directly to verify on-disk layout.
    const onDisk = await readFile(join(dir, "pages", "ab", "abcde.json"), "utf8");
    expect(JSON.parse(onDisk).title).toBe("A");
  });

  it("uses the full id as shard when shorter than two chars", async () => {
    const cache = createPageCache(dir);
    await cache.set(rawPage("x", "Short"));
    // slice(0, 2) of "x" is just "x" — it's truthy so the `_` fallback only
    // fires for the empty-string edge case.
    const onDisk = await readFile(join(dir, "pages", "x", "x.json"), "utf8");
    expect(JSON.parse(onDisk).id).toBe("x");
  });

  it("overwrites existing entries", async () => {
    const cache = createPageCache(dir);
    await cache.set(rawPage("abc", "v1"));
    await cache.set({ ...rawPage("abc", "v2"), updated: 1_800_000_000 });
    const got = await cache.get("abc");
    expect(got?.title).toBe("v2");
    expect(got?.updated).toBe(1_800_000_000);
  });

  it("treats a corrupt (truncated) cache file as a miss instead of throwing", async () => {
    const cache = createPageCache(dir);
    await cache.set(rawPage("abc123", "Hello"));
    // Simulate a write interrupted mid-file (pre-atomic-rename builds).
    const path = join(dir, "pages", "ab", "abc123.json");
    await writeFile(path, '{"id": "abc123", "title": "Hel');
    expect(await cache.get("abc123")).toBeNull();
  });

  it("treats a wrong-shape cache file as a miss", async () => {
    const cache = createPageCache(dir);
    await cache.set(rawPage("abc123", "Hello"));
    const path = join(dir, "pages", "ab", "abc123.json");
    await writeFile(path, JSON.stringify({ id: "abc123", totally: "unrelated" }));
    expect(await cache.get("abc123")).toBeNull();
  });

  it("leaves no temp files behind after set", async () => {
    const cache = createPageCache(dir);
    await cache.set(rawPage("abc123", "Hello"));
    const entries = await readdir(join(dir, "pages", "ab"));
    expect(entries).toEqual(["abc123.json"]);
  });

  it("exposes the cache directory", () => {
    const cache = createPageCache(dir);
    expect(cache.dir()).toBe(dir);
  });
});
