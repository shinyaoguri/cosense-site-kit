import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCosenseSource } from "../src/source/cosense";

// Locks down the cache freshness contract: an edited page (Cosense bumps
// `updated`) must trigger a refetch; an untouched page must be served from
// disk without an API call.

function listResponse(pages: { id: string; title: string; updated: number }[]) {
  return new Response(
    JSON.stringify({
      projectName: "p",
      skip: 0,
      limit: 100,
      count: pages.length,
      pages: pages.map((p) => ({
        ...p,
        image: null,
        descriptions: [],
        user: { id: "u" },
        pin: 0,
        views: 0,
        linked: 0,
        created: 1_600_000_000,
      })),
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function pageResponse(o: { id: string; title: string; updated: number; text: string }) {
  return new Response(
    JSON.stringify({
      id: o.id,
      title: o.title,
      image: null,
      descriptions: [],
      user: { id: "u" },
      pin: 0,
      views: 0,
      linked: 0,
      created: 1_600_000_000,
      updated: o.updated,
      persistent: true,
      lines: o.text.split("\n").map((text, i) => ({
        id: `l${i}`,
        text,
        userId: "u",
        created: 1_600_000_000,
        updated: o.updated,
      })),
      links: [],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("createCosenseSource cache freshness", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  let cacheDir: string;

  beforeEach(async () => {
    fetchSpy.mockReset();
    cacheDir = await mkdtemp(join(tmpdir(), "cosense-source-"));
  });
  afterEach(async () => {
    fetchSpy.mockReset();
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("populates cache on first fetch (cold path)", async () => {
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nv1" }),
    );
    const source = createCosenseSource({ project: "p", cacheDir });
    const page = await source.fetch({
      id: "a",
      title: "A",
      updated: 1_700_000_000,
      sourceUrl: "https://scrapbox.io/p/A",
    });
    expect(page.text).toContain("v1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(await source.cache.get("a")).not.toBeNull();
  });

  it("serves from cache without a network call when timestamps match", async () => {
    const source = createCosenseSource({ project: "p", cacheDir });
    // Seed cache.
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nv1" }),
    );
    await source.fetch({ id: "a", title: "A", updated: 1_700_000_000, sourceUrl: "u" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call with the same updated should hit cache only.
    const page = await source.fetch({
      id: "a",
      title: "A",
      updated: 1_700_000_000,
      sourceUrl: "u",
    });
    expect(page.text).toContain("v1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("refetches when ref.updated is newer than the cached entry", async () => {
    const source = createCosenseSource({ project: "p", cacheDir });
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nv1" }),
    );
    await source.fetch({ id: "a", title: "A", updated: 1_700_000_000, sourceUrl: "u" });

    // Cosense edit: list endpoint now reports a newer updated.
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_500, text: "A\nv2" }),
    );
    const page = await source.fetch({
      id: "a",
      title: "A",
      updated: 1_700_000_500,
      sourceUrl: "u",
    });
    expect(page.text).toContain("v2");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect((await source.cache.get("a"))?.text).toContain("v2");
  });

  it("force: true bypasses cache even when the timestamp matches", async () => {
    const source = createCosenseSource({ project: "p", cacheDir });
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nv1" }),
    );
    await source.fetch({ id: "a", title: "A", updated: 1_700_000_000, sourceUrl: "u" });

    const forced = createCosenseSource({ project: "p", cacheDir, force: true });
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nrefetched" }),
    );
    const page = await forced.fetch({
      id: "a",
      title: "A",
      updated: 1_700_000_000,
      sourceUrl: "u",
    });
    expect(page.text).toContain("refetched");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("skips (returns null) when the page 404s — deleted between list and fetch", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const source = createCosenseSource({ project: "p", cacheDir });
    const warnings: string[] = [];
    const page = await source.fetch(
      { id: "gone", title: "Gone", updated: 1_700_000_000, sourceUrl: "u" },
      { onWarn: (m) => warnings.push(m) },
    );
    expect(page).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Gone");
  });

  it("does not resurrect a deleted page from cache on 404", async () => {
    const source = createCosenseSource({ project: "p", cacheDir });
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nv1" }),
    );
    await source.fetch({ id: "a", title: "A", updated: 1_700_000_000, sourceUrl: "u" });

    // The list said the page changed, but by fetch time it was deleted.
    fetchSpy.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const page = await source.fetch(
      { id: "a", title: "A", updated: 1_700_000_500, sourceUrl: "u" },
      { onWarn: () => {} },
    );
    expect(page).toBeNull();
  });

  it("falls back to the stale cached copy on a transient failure", async () => {
    const source = createCosenseSource({ project: "p", cacheDir });
    fetchSpy.mockResolvedValueOnce(
      pageResponse({ id: "a", title: "A", updated: 1_700_000_000, text: "A\nv1" }),
    );
    await source.fetch({ id: "a", title: "A", updated: 1_700_000_000, sourceUrl: "u" });

    // Refetch needed (newer updated) but the API now fails. 400 is non-retryable,
    // so the failure surfaces immediately without exercising backoff delays.
    fetchSpy.mockResolvedValueOnce(new Response("bad", { status: 400 }));
    const warnings: string[] = [];
    const page = await source.fetch(
      { id: "a", title: "A", updated: 1_700_000_500, sourceUrl: "u" },
      { onWarn: (m) => warnings.push(m) },
    );
    expect(page?.text).toContain("v1");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("cached copy");
  });

  it("still throws on a transient failure when there is no cached copy", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("bad", { status: 400 }));
    const source = createCosenseSource({ project: "p", cacheDir });
    await expect(
      source.fetch({ id: "x", title: "X", updated: 1_700_000_000, sourceUrl: "u" }),
    ).rejects.toThrow();
  });

  it("list returns refs carrying the current updated timestamp", async () => {
    fetchSpy.mockResolvedValueOnce(
      listResponse([
        { id: "a", title: "A", updated: 1_700_000_000 },
        { id: "b", title: "B", updated: 1_700_000_100 },
      ]),
    );
    const source = createCosenseSource({ project: "p", cacheDir });
    const refs = await source.list();
    expect(refs.map((r) => [r.id, r.updated])).toEqual([
      ["a", 1_700_000_000],
      ["b", 1_700_000_100],
    ]);
  });
});
