import { describe, expect, it } from "vitest";
import { resolveInternalLinks } from "../src/resolve/links";
import type { CosenseBlock } from "../src/schema/v1/block";
import type { CosenseSitePage } from "../src/schema/v1/page";

function page(title: string, blocks: CosenseBlock[]): CosenseSitePage {
  return {
    schemaVersion: "1",
    id: title,
    title,
    slug: title.toLowerCase(),
    sourceUrl: `https://scrapbox.io/p/${title}`,
    template: "page",
    tags: [],
    links: [],
    backlinks: [],
    blocks,
  } as unknown as CosenseSitePage;
}

// Parser emits pageLinks with exists:true; resolution must overwrite that.
const link = (title: string) => ({ type: "pageLink" as const, title, exists: true });

describe("resolveInternalLinks", () => {
  it("resolves pageLinks inside quote blocks", () => {
    const pages = resolveInternalLinks([
      page("Target", []),
      page("Src", [{ type: "quote", children: [link("Target"), link("Ghost")] }]),
    ]);
    const quote = pages[1]?.blocks[0];
    if (quote?.type !== "quote") throw new Error("expected quote");
    const [hit, miss] = quote.children;
    if (hit?.type !== "pageLink" || miss?.type !== "pageLink")
      throw new Error("expected pageLinks");
    expect(hit.slug).toBe("target");
    expect(hit.exists).toBe(true);
    expect(miss.slug).toBeUndefined();
    expect(miss.exists).toBe(false);
  });

  it("resolves pageLinks inside table cells", () => {
    const pages = resolveInternalLinks([
      page("Target", []),
      page("Src", [{ type: "table", rows: [[[link("Target")], [link("Ghost")]]] }]),
    ]);
    const table = pages[1]?.blocks[0];
    if (table?.type !== "table") throw new Error("expected table");
    const hit = table.rows[0]?.[0]?.[0];
    const miss = table.rows[0]?.[1]?.[0];
    if (hit?.type !== "pageLink" || miss?.type !== "pageLink")
      throw new Error("expected pageLinks");
    expect(hit.slug).toBe("target");
    expect(hit.exists).toBe(true);
    expect(miss.slug).toBeUndefined();
    expect(miss.exists).toBe(false);
  });

  it("still resolves pageLinks nested in paragraph inline runs", () => {
    const pages = resolveInternalLinks([
      page("Target", []),
      page("Src", [
        { type: "paragraph", children: [{ type: "strong", children: [link("Target")] }] },
      ]),
    ]);
    const para = pages[1]?.blocks[0];
    if (para?.type !== "paragraph") throw new Error("expected paragraph");
    const strong = para.children[0];
    if (strong?.type !== "strong") throw new Error("expected strong");
    const inner = strong.children[0];
    if (inner?.type !== "pageLink") throw new Error("expected pageLink");
    expect(inner.slug).toBe("target");
  });
});
