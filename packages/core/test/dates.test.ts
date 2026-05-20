import { describe, expect, it } from "vitest";
import { assignDates, parseUserDate } from "../src/resolve/dates";
import type { CosenseSitePage } from "../src/schema/v1/page";

function page(overrides: Partial<CosenseSitePage> & { title: string }): CosenseSitePage {
  return {
    schemaVersion: "1",
    id: overrides.id ?? "1",
    title: overrides.title,
    slug: overrides.slug ?? "p",
    sourceUrl: "https://scrapbox.io/p/P",
    template: "page",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    tags: overrides.tags ?? [],
    links: [],
    backlinks: [],
    blocks: [],
    ...overrides,
  };
}

describe("parseUserDate", () => {
  it("accepts a valid YYYY-MM-DD and returns UTC-midnight ISO", () => {
    expect(parseUserDate("2026-05-20")).toBe("2026-05-20T00:00:00.000Z");
  });

  it("rejects malformed strings", () => {
    expect(parseUserDate("2026/05/20")).toBeUndefined();
    expect(parseUserDate("May 20")).toBeUndefined();
    expect(parseUserDate("2026-5-2")).toBeUndefined();
    expect(parseUserDate("")).toBeUndefined();
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(parseUserDate("2026-02-30")).toBeUndefined();
    expect(parseUserDate("2026-13-01")).toBeUndefined();
    expect(parseUserDate("2026-00-10")).toBeUndefined();
  });
});

describe("assignDates", () => {
  it("falls back to Cosense timestamps when no date tags are present", () => {
    const { pages, warnings } = assignDates([page({ title: "A" })]);
    expect(pages[0]?.publishedAt).toBe("2024-01-01T00:00:00.000Z"); // createdAt
    expect(pages[0]?.modifiedAt).toBe("2024-06-01T00:00:00.000Z"); // updatedAt
    expect(warnings).toEqual([]);
  });

  it("uses the user-specified publish and updated dates when valid", () => {
    const { pages } = assignDates([
      page({ title: "A", tags: ["published/2025-03-04", "updated/2025-09-10"] }),
    ]);
    expect(pages[0]?.publishedAt).toBe("2025-03-04T00:00:00.000Z");
    expect(pages[0]?.modifiedAt).toBe("2025-09-10T00:00:00.000Z");
  });

  it("keeps the raw Cosense timestamps alongside the resolved dates", () => {
    const { pages } = assignDates([page({ title: "A", tags: ["published/2025-03-04"] })]);
    expect(pages[0]?.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(pages[0]?.updatedAt).toBe("2024-06-01T00:00:00.000Z");
    expect(pages[0]?.publishedAt).toBe("2025-03-04T00:00:00.000Z");
  });

  it("falls back and warns when a date tag is invalid", () => {
    const { pages, warnings } = assignDates([
      page({ title: "Bad", tags: ["published/2026-02-30"] }),
    ]);
    expect(pages[0]?.publishedAt).toBe("2024-01-01T00:00:00.000Z"); // createdAt fallback
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Bad");
    expect(warnings[0]).toContain("published/2026-02-30");
  });
});
