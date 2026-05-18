import { describe, expect, it } from "vitest";
import type { CosenseBlock } from "@cosense-site-kit/core";
import { cardSummary, formatYmd } from "../src/lib/cards";

function para(text: string): CosenseBlock {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

describe("cardSummary", () => {
  it("uses page.summary when provided", () => {
    const s = cardSummary({
      data: { title: "T", slug: "t", summary: "hello", blocks: [para("body")] },
    });
    expect(s.description).toBe("hello");
  });

  it("falls back to first non-empty paragraph for description", () => {
    const s = cardSummary({
      data: { title: "T", slug: "t", blocks: [para(""), para("intro")] },
    });
    expect(s.description).toBe("intro");
  });

  it("extracts first image as thumbnail", () => {
    const s = cardSummary({
      data: {
        title: "T",
        slug: "t",
        blocks: [
          para("text"),
          { type: "image", url: "https://example.com/a.png" },
          { type: "image", url: "https://example.com/b.png" },
        ],
      },
    });
    expect(s.image).toBe("https://example.com/a.png");
  });

  it("returns null image and date when nothing is present", () => {
    const s = cardSummary({ data: { title: "T", slug: "t", blocks: [] } });
    expect(s.image).toBeNull();
    expect(s.date).toBeNull();
  });

  it("prefers createdAt over updatedAt", () => {
    const s = cardSummary({
      data: {
        title: "T",
        slug: "t",
        blocks: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
    });
    expect(s.date?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });
});

describe("formatYmd", () => {
  it("returns empty string for null", () => {
    expect(formatYmd(null)).toBe("");
  });
  it("formats in ja-JP YYYY/MM/DD", () => {
    expect(formatYmd(new Date("2024-03-05T12:00:00Z"))).toMatch(/2024\/0?3\/0?5/);
  });
});
