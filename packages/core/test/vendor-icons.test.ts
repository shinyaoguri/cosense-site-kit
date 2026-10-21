import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { assertFetchableUrl, vendorIcons, vendorImage } from "../src/assets/icons";
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
    const firstIcon = (
      (first.pages[0]!.blocks[0] as { children: unknown[] }).children[1] as {
        children: { src: string }[];
      }
    ).children[0];
    const secondIcon = (
      (second.pages[0]!.blocks[0] as { children: unknown[] }).children[1] as {
        children: { src: string }[];
      }
    ).children[0];
    expect(secondIcon?.src).toBe(firstIcon?.src);
  });

  it("does not reuse a truncated (0-byte) icon; it refetches", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => pngResponse());
    const opts = {
      dir,
      baseUrl: "/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };

    await vendorIcons(dataWithIcons([ICON_URL]), opts);
    // Simulate a build killed mid-write before the atomic rename existed.
    const [name] = await readdir(dir);
    await writeFile(join(dir, name ?? ""), new Uint8Array([]));

    await vendorIcons(dataWithIcons([ICON_URL]), opts);
    // Refetched because the cached file was empty (not reused).
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(await readFile(join(dir, name ?? ""))).toHaveLength(4);
  });

  it("vendors icons inside table cells", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icons-"));
    const fetchImpl = vi.fn(async () => pngResponse());
    const data = {
      ...dataWithIcons([]),
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
              type: "table",
              rows: [[[{ type: "icon", pageTitle: "u", project: "p", src: ICON_URL }]]],
            },
          ],
        },
      ],
    } as unknown as IntermediateData;

    const out = await vendorIcons(data, {
      dir,
      baseUrl: "/cosense-icons",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const table = out.pages[0]?.blocks[0];
    if (table?.type !== "table") throw new Error("expected table");
    const cell = table.rows[0]?.[0]?.[0];
    if (cell?.type !== "icon") throw new Error("expected icon");
    expect(cell.src).toMatch(/^\/cosense-icons\/[a-f0-9]{16}\.png$/);
    expect(fetchImpl).toHaveBeenCalledOnce();
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

describe("vendorImage hardening", () => {
  const SRC = "https://img.example/favicon";
  const base = async () => ({
    dir: await mkdtemp(join(tmpdir(), "icons-")),
    baseUrl: "/cosense-icons",
  });

  it("does not vendor SVG (it would run script on the site's origin)", async () => {
    const opts = await base();
    const fetchImpl = vi.fn(
      async () =>
        new Response("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", {
          headers: { "content-type": "image/svg+xml" },
        }),
    );
    const onWarn = vi.fn();
    const out = await vendorImage(SRC, {
      ...opts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onWarn,
    });
    expect(out).toBe(SRC);
    expect(onWarn).toHaveBeenCalledOnce();
    expect(await readdir(opts.dir)).toHaveLength(0);
  });

  it("removes SVG files vendored by earlier versions", async () => {
    const opts = await base();
    await writeFile(join(opts.dir, "0123456789abcdef.svg"), "<svg/>");
    await writeFile(join(opts.dir, "keep-me.svg"), "<svg/>");
    const fetchImpl = vi.fn(async () => pngResponse());
    await vendorImage(SRC, { ...opts, fetchImpl: fetchImpl as unknown as typeof fetch });
    const names = await readdir(opts.dir);
    expect(names).not.toContain("0123456789abcdef.svg");
    expect(names).toContain("keep-me.svg");
  });

  it("rejects a response whose Content-Length exceeds the cap", async () => {
    const opts = await base();
    const fetchImpl = vi.fn(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { "content-type": "image/png", "content-length": String(6 * 1024 * 1024) },
        }),
    );
    const onWarn = vi.fn();
    const out = await vendorImage(SRC, {
      ...opts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onWarn,
    });
    expect(out).toBe(SRC);
    expect(onWarn.mock.calls[0]?.[0]).toMatch(/too large/);
  });

  it("stops reading a streamed body once it exceeds the cap", async () => {
    const opts = await base();
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent++;
        if (sent > 50) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const fetchImpl = vi.fn(
      async () => new Response(body, { headers: { "content-type": "image/png" } }),
    );
    const onWarn = vi.fn();
    const out = await vendorImage(SRC, {
      ...opts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onWarn,
    });
    expect(out).toBe(SRC);
    expect(onWarn.mock.calls[0]?.[0]).toMatch(/too large/);
    expect(sent).toBeLessThan(10);
  });

  it("refuses local/private hosts without sending a request", async () => {
    for (const src of [
      "http://127.0.0.1/x.png",
      "http://0x7f.1/x.png",
      "http://localhost:8080/x.png",
      "http://169.254.169.254/latest/meta-data",
      "http://10.0.0.1/x.png",
      "http://192.168.1.1/x.png",
      "http://[::1]/x.png",
      "http://[::ffff:127.0.0.1]/x.png",
      "http://[fd00::1]/x.png",
      "file:///etc/passwd",
    ]) {
      const opts = await base();
      const fetchImpl = vi.fn(async () => pngResponse());
      const out = await vendorImage(src, {
        ...opts,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(out, src).toBe(src);
      expect(fetchImpl, src).not.toHaveBeenCalled();
    }
  });

  it("checks each redirect hop before following it", async () => {
    const opts = await base();
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data" },
        }),
    );
    const out = await vendorImage(SRC, {
      ...opts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBe(SRC);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("follows a redirect to a public host, with a timeout signal", async () => {
    const opts = await base();
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) =>
      url === SRC
        ? new Response(null, { status: 302, headers: { location: "/real.png" } })
        : pngResponse(),
    );
    const out = await vendorImage(SRC, {
      ...opts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toMatch(/^\/cosense-icons\/[0-9a-f]{16}\.png$/);
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([SRC, "https://img.example/real.png"]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init?.redirect).toBe("manual");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("assertFetchableUrl accepts ordinary public URLs", () => {
    expect(() => assertFetchableUrl("https://scrapbox.io/api/pages/p/u/icon")).not.toThrow();
    expect(() => assertFetchableUrl("https://172.32.0.1/x.png")).not.toThrow();
  });
});
