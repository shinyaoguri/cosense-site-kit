import { describe, expect, it } from "vitest";
import { formatDate } from "../src/dates";

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
