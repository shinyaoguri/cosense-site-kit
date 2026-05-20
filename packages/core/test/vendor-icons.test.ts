import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { vendorIcons } from "../src/assets/icons";
import type { IntermediateData } from "../src/schema/v1/page";

function dataWithIcons(srcs: string[]): IntermediateData {
  return {
    schemaVersion: "1",
    generatedAt: "2026-05-20T00:00:00.000Z",
    site: { title: "T", baseUrl: "https://e.com", lang: "en" },
    pages: [
      {
        schemaVersion: "1",
        id: "1",
        title: "A",
        slug: "a",
        sourceUrl: "https://scrapbox.io/p/A",
        template: "page",
        tags: [],
        links: [],
        backlinks: [],
        blocks: [
          {
            type: "paragraph",
            children: [
              { type: "text", value: "hi " },
              // Nest one icon inside a strong run to exercise recursion.
              {
                type: "strong",
                children: srcs.map((src) => ({
                  type: "icon" as const,
                  pageTitle: "u",
                  project: "p",
                  src,
                })),
              },
            ],
          },
        ],
      },
    ],
    excluded: [],
    linkGraph: {},
    structure: { nav: [], templates: {}, redirects: {} },
    warnings: [],
  } as unknown as IntermediateData;
}

function pngResponse(): Response {
  return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
    status: 200,
    headers: { "content-type": "image/png" },
  });
}

const ICON_URL = "https://scrapbox.io/api/pages/p/u/icon";

describe("vendorIcons", () => {
  it("downloads each icon and rewrites src to a local base-prefixed path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => pngResponse());

    const out = await vendorIcons(dataWithIcons([ICON_URL]), {
      dir,
      baseUrl: "/site/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const strong = out.pages[0]!.blocks[0]!;
    if (strong.type !== "paragraph") throw new Error("expected paragraph");
    const inner = strong.children[1];
    if (!inner || inner.type !== "strong") throw new Error("expected strong");
    const icon = inner.children[0];
    if (!icon || icon.type !== "icon") throw new Error("expected icon");

    expect(icon.src).toMatch(/^\/site\/cosense-icons\/[a-f0-9]{16}\.png$/);
    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    expect(await readFile(join(dir, files[0]!))).toHaveLength(4);
  });

  it("dedupes identical icon URLs into a single download", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => pngResponse());

    await vendorIcons(dataWithIcons([ICON_URL, ICON_URL, ICON_URL]), {
      dir,
      baseUrl: "/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await readdir(dir)).toHaveLength(1);
  });

  it("keeps the original src and warns when a download fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    const onWarn = vi.fn();

    const out = await vendorIcons(dataWithIcons([ICON_URL]), {
      dir,
      baseUrl: "/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onWarn,
    });

    const para = out.pages[0]!.blocks[0]!;
    if (para.type !== "paragraph") throw new Error("expected paragraph");
    const inner = para.children[1];
    if (!inner || inner.type !== "strong") throw new Error("expected strong");
    const icon = inner.children[0];
    if (!icon || icon.type !== "icon") throw new Error("expected icon");

    expect(icon.src).toBe(ICON_URL);
    expect(onWarn).toHaveBeenCalledOnce();
    expect(await readdir(dir)).toHaveLength(0);
  });

  it("reuses an already-downloaded file without refetching", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => pngResponse());
    const opts = {
      dir,
      baseUrl: "/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };

    const first = await vendorIcons(dataWithIcons([ICON_URL]), opts);
    const second = await vendorIcons(dataWithIcons([ICON_URL]), opts);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const firstIcon = ((first.pages[0]!.blocks[0] as { children: unknown[] }).children[1] as {
      children: { src: string }[];
    }).children[0];
    const secondIcon = ((second.pages[0]!.blocks[0] as { children: unknown[] }).children[1] as {
      children: { src: string }[];
    }).children[0];
    expect(secondIcon.src).toBe(firstIcon.src);
  });

  it("returns data unchanged when there are no icons", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => pngResponse());
    const data = dataWithIcons([]);

    const out = await vendorIcons(data, {
      dir,
      baseUrl: "/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(out).toBe(data);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
