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
});
