import { describe, expect, it } from "vitest";
import type { CosenseBlock } from "@cosense-site-kit/core";
import { formatPostDate, postSummary } from "../src/lib/blog";

function para(text: string): CosenseBlock {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

describe("postSummary", () => {
  it("uses page.summary when available", () => {
    const summary = postSummary({
      data: {
        title: "T",
        slug: "t",
        summary: "explicit summary",
        blocks: [para("body text")],
      },
    });
    expect(summary.description).toBe("explicit summary");
  });

  it("falls back to first non-empty paragraph", () => {
    const summary = postSummary({
      data: {
        title: "T",
        slug: "t",
        blocks: [para(""), para("real intro")],
      },
    });
    expect(summary.description).toBe("real intro");
  });

  it("extracts first image as thumbnail", () => {
    const summary = postSummary({
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
    expect(summary.image).toBe("https://example.com/a.png");
  });

  it("returns null image when none present", () => {
    const summary = postSummary({
      data: { title: "T", slug: "t", blocks: [para("hi")] },
    });
    expect(summary.image).toBeNull();
  });

  it("prefers createdAt over updatedAt for date", () => {
    const summary = postSummary({
      data: {
        title: "T",
        slug: "t",
        blocks: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
    });
    expect(summary.date?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });
});

describe("formatPostDate", () => {
  it("returns empty string for null", () => {
    expect(formatPostDate(null)).toBe("");
  });

  it("formats a date in ja-JP YYYY/MM/DD", () => {
    // Use UTC noon so locale time zones don't shift the date.
    const out = formatPostDate(new Date("2024-03-05T12:00:00Z"));
    expect(out).toMatch(/2024\/0?3\/0?5/);
  });
});
