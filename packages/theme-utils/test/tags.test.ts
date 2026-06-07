import { describe, expect, it } from "vitest";
import { hidesDates, isHiddenTag, isPublicTag, NO_DATE_TAG } from "../src/tags";

describe("isHiddenTag", () => {
  it("hides control tags", () => {
    expect(isHiddenTag("publish")).toBe(true);
    expect(isHiddenTag("draft")).toBe(true);
  });

  it("hides namespaced date-metadata tags", () => {
    expect(isHiddenTag("published/2026-05-20")).toBe(true);
    expect(isHiddenTag("updated/2026-05-20")).toBe(true);
  });

  it("does not hide ordinary categories", () => {
    expect(isHiddenTag("diary")).toBe(false);
    expect(isHiddenTag("lab/news")).toBe(false);
  });
});

describe("isPublicTag", () => {
  it("treats bare categories as public chips", () => {
    expect(isPublicTag("diary")).toBe(true);
  });

  it("excludes control and namespaced tags from chips", () => {
    expect(isPublicTag("publish")).toBe(false);
    expect(isPublicTag("published/2026-05-20")).toBe(false);
    expect(isPublicTag("template/profile")).toBe(false);
  });
});

describe("hidesDates / #no-date", () => {
  it("is a hidden, non-public control tag (no chip, not a category)", () => {
    expect(isHiddenTag(NO_DATE_TAG)).toBe(true);
    expect(isPublicTag(NO_DATE_TAG)).toBe(false);
  });

  it("reports whether a page opts out of showing its dates", () => {
    expect(hidesDates([NO_DATE_TAG])).toBe(true);
    expect(hidesDates(["publish", "diary", NO_DATE_TAG])).toBe(true);
    expect(hidesDates(["publish", "diary"])).toBe(false);
    expect(hidesDates([])).toBe(false);
  });
});
