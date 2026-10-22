import { describe, expect, it } from "vitest";
import { isSafeHref, isSafePathSegment, isSafeRedirect } from "../src/url";

describe("isSafeHref", () => {
  it("accepts http(s), mailto:, tel:, site-relative paths and fragments", () => {
    for (const href of ["https://example.com", "mailto:a@b", "tel:123", "/blog", "#top"]) {
      expect(isSafeHref(href)).toBe(true);
    }
  });

  it("rejects protocol-relative hosts, including the backslash form", () => {
    // Browsers treat "\" as "/" in special-scheme URLs, so "/\evil.com"
    // resolves to https://evil.com/ just like "//evil.com".
    for (const href of ["//evil.com", "/\\evil.com", "/\\\\evil.com"]) {
      expect(isSafeHref(href)).toBe(false);
    }
  });
});

describe("isSafeRedirect", () => {
  it("accepts slugs and site-relative paths", () => {
    expect(isSafeRedirect("new-slug")).toBe(true);
    expect(isSafeRedirect("/blog")).toBe(true);
  });

  it("rejects schemes, protocol-relative hosts and backslashes", () => {
    for (const to of [
      "https://evil.com",
      "javascript:alert(1)",
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
    ]) {
      expect(isSafeRedirect(to)).toBe(false);
    }
  });
});

describe("isSafePathSegment", () => {
  it("accepts ordinary single segments, including non-ASCII and symbols", () => {
    for (const seg of ["diary", "日記", "C++", "a_b", "v1.2"]) {
      expect(isSafePathSegment(seg)).toBe(true);
    }
  });

  it("rejects segments that a URL parser or static host would rewrite", () => {
    // Empty and dot segments are dropped, "\\" reads as "/", "%XX" is decoded,
    // "?"/"#" end the path, and leading-dot names look like hidden files.
    for (const seg of ["", ".", "..", ".net", "a/b", "a\\b", "100%", "%2e", "a?b", "a#b", "a\tb"]) {
      expect(isSafePathSegment(seg)).toBe(false);
    }
  });
});
