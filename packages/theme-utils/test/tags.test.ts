import { describe, expect, it } from "vitest";
import { isHiddenTag, isPublicTag } from "../src/tags";

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
