import { describe, expect, it } from "vitest";
import { isDotSegment, isSafeHref, isSafePathSegment, isSafeRedirect } from "../src/url";

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

describe("isDotSegment", () => {
  it("matches the segments URL parsing resolves, in any escaped form", () => {
    // WHATWG URL resolves "%2E" / "%2e%2E" like "." / "..", so escaping can't
    // keep a dot-only title in a request path (#199).
    for (const seg of [".", "..", "%2E", "%2e", ".%2E", "%2E%2e"]) {
      expect(isDotSegment(seg)).toBe(true);
    }
    expect(new URL("https://x/api/pages/p/%2E%2E").pathname).toBe("/api/pages/");
  });

  it("does not match other dotted names", () => {
    for (const seg of ["...", ".a", "a.", "v1.2", "", "%2E%2E%2E"]) {
      expect(isDotSegment(seg)).toBe(false);
    }
  });
});
