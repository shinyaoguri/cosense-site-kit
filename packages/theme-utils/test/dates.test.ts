import { describe, expect, it } from "vitest";
import { formatDate, pageMetaDates } from "../src/dates";

describe("formatDate", () => {
  it("formats an ISO timestamp as YYYY-MM-DD (UTC)", () => {
    expect(formatDate("2026-05-20T09:30:00.000Z")).toBe("2026-05-20");
  });

  it("returns undefined for undefined input", () => {
    expect(formatDate(undefined)).toBeUndefined();
  });

  it("returns undefined (not a crash) for an unparseable string", () => {
    // Public helper: a theme author could pass any string. Must guard like
    // feed.ts's rfc822 instead of throwing RangeError from toISOString().
    expect(formatDate("not-a-date")).toBeUndefined();
    expect(formatDate("")).toBeUndefined();
  });
});

describe("pageMetaDates", () => {
  const published = "2026-05-20T09:30:00.000Z";
  const laterSameDay = "2026-05-20T22:00:00.000Z";
  const nextDay = "2026-05-21T09:30:00.000Z";

  it("returns the publish date, keeping the raw ISO for <time datetime>", () => {
    expect(pageMetaDates({ publishedAt: published })).toEqual({
      published: { iso: published, label: "2026-05-20" },
    });
  });

  it("adds the update date only when it lands on a different day", () => {
    expect(pageMetaDates({ publishedAt: published, modifiedAt: nextDay }).updated).toEqual({
      iso: nextDay,
      label: "2026-05-21",
    });
    // Edited the same day it was published → one date, not two identical ones.
    expect(
      pageMetaDates({ publishedAt: published, modifiedAt: laterSameDay }).updated,
    ).toBeUndefined();
  });

  it("suppresses both dates for a page tagged #no-date", () => {
    // The control tag is what forked themes forgot to honour (#126); it has to
    // work from the tag list alone, with no cooperation from the caller.
    expect(
      pageMetaDates({ tags: ["no-date"], publishedAt: published, modifiedAt: nextDay }),
    ).toEqual({});
  });

  it("matches #no-date case-insensitively, like Cosense itself", () => {
    expect(pageMetaDates({ tags: ["No-Date"], publishedAt: published })).toEqual({});
  });

  it("honours an explicit show: false from the caller", () => {
    expect(pageMetaDates({ publishedAt: published, show: false })).toEqual({});
  });

  it("drops an unparseable timestamp instead of throwing", () => {
    expect(pageMetaDates({ publishedAt: "not-a-date", modifiedAt: nextDay })).toEqual({
      updated: { iso: nextDay, label: "2026-05-21" },
    });
  });

  it("returns nothing when the page has no dates at all", () => {
    expect(pageMetaDates({ tags: ["diary"] })).toEqual({});
  });
});
