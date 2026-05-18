import { describe, expect, it } from "vitest";
import { pageSchema } from "../src/schema";
import { normalizePage } from "../src/source/cosense/normalize";
import type { SourcePageRaw } from "../src/source/types";

const sample: SourcePageRaw = {
  id: "abc123",
  title: "Welcome",
  updated: 1_700_000_000,
  created: 1_600_000_000,
  text: ["Welcome", "#publish", "intro to [Other]", "code:foo.ts", " const x = 1;"].join("\n"),
  links: ["Other", "Linked-From-Side"],
  image: null,
  descriptions: ["intro to other"],
  sourceUrl: "https://scrapbox.io/my-proj/Welcome",
};

describe("normalizePage", () => {
  it("produces a schema-valid intermediate page", () => {
    const page = normalizePage(sample);
    expect(() =>
      pageSchema.parse({ ...page, slug: "welcome" }),
    ).not.toThrow();
  });

  it("merges parsed page links with source-side links and dedupes", () => {
    const page = normalizePage(sample);
    expect(page.links).toContain("Other");
    expect(page.links).toContain("Linked-From-Side");
    expect(new Set(page.links).size).toBe(page.links.length);
  });

  it("captures tags from the body", () => {
    const page = normalizePage(sample);
    expect(page.tags).toContain("publish");
  });

  it("keeps backlinks empty until the pipeline computes them", () => {
    expect(normalizePage(sample).backlinks).toEqual([]);
  });

  it("derives summary from the first paragraph with visible text, skipping tag-only lines", () => {
    const page = normalizePage({
      ...sample,
      text: ["Welcome", "#publish #post", "", "actual intro text"].join("\n"),
      descriptions: [],
    });
    expect(page.summary).toBe("actual intro text");
  });

  it("falls back to descriptions[0] when no paragraph has content", () => {
    const page = normalizePage({
      ...sample,
      text: ["Welcome"].join("\n"),
      descriptions: ["api description"],
    });
    expect(page.summary).toBe("api description");
  });

  it("rejects an all-tag descriptions[0] fallback", () => {
    const page = normalizePage({
      ...sample,
      text: "Welcome",
      descriptions: ["#publish #post"],
    });
    expect(page.summary).toBeUndefined();
  });
});
