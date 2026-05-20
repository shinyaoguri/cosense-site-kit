import type { CosenseBlock } from "@cosense-site-kit/core";
import { describe, expect, it } from "vitest";
import { formatNewsDate, newsSummary } from "../src/lib/news";

function para(text: string): CosenseBlock {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

describe("newsSummary", () => {
  it("uses summary when provided", () => {
    const s = newsSummary({
      data: { title: "T", slug: "t", summary: "hello", blocks: [para("body")] },
    });
    expect(s.description).toBe("hello");
  });

  it("falls back to the first non-empty paragraph", () => {
    const s = newsSummary({
      data: { title: "T", slug: "t", blocks: [para(""), para("intro")] },
    });
    expect(s.description).toBe("intro");
  });

  it("prefers createdAt over updatedAt for date", () => {
    const s = newsSummary({
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

  it("returns null date when neither timestamp is present", () => {
    const s = newsSummary({ data: { title: "T", slug: "t", blocks: [] } });
    expect(s.date).toBeNull();
  });
});

describe("formatNewsDate", () => {
  it("returns empty string for null", () => {
    expect(formatNewsDate(null)).toBe("");
  });
  it("formats in ja-JP YYYY/MM/DD", () => {
    expect(formatNewsDate(new Date("2024-03-05T12:00:00Z"))).toMatch(/2024\/0?3\/0?5/);
  });
});
