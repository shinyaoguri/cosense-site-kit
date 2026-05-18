import { describe, expect, it } from "vitest";
import { normalizeBase, pathFor } from "../src";

describe("normalizeBase", () => {
  it("returns '/' for empty or root", () => {
    expect(normalizeBase("")).toBe("/");
    expect(normalizeBase("/")).toBe("/");
  });

  it("adds leading and trailing slashes", () => {
    expect(normalizeBase("cosense-site-kit")).toBe("/cosense-site-kit/");
    expect(normalizeBase("/cosense-site-kit")).toBe("/cosense-site-kit/");
    expect(normalizeBase("cosense-site-kit/")).toBe("/cosense-site-kit/");
    expect(normalizeBase("/cosense-site-kit/")).toBe("/cosense-site-kit/");
  });

  it("collapses repeated slashes", () => {
    expect(normalizeBase("///foo///")).toBe("/foo/");
  });
});

describe("pathFor", () => {
  it("encodes each segment once with no base", () => {
    expect(pathFor("research")).toBe("/research");
    expect(pathFor("Foo Bar")).toBe("/Foo%20Bar");
    expect(pathFor("プレゼン")).toBe("/%E3%83%97%E3%83%AC%E3%82%BC%E3%83%B3");
  });

  it("preserves /-delimited segments", () => {
    expect(pathFor("lab/news")).toBe("/lab/news");
    expect(pathFor("a/b/c")).toBe("/a/b/c");
  });

  it("prepends a base when given", () => {
    expect(pathFor("research", "/cosense-site-kit")).toBe("/cosense-site-kit/research");
    expect(pathFor("research", "/cosense-site-kit/")).toBe("/cosense-site-kit/research");
    expect(pathFor("lab/news", "cosense-site-kit")).toBe("/cosense-site-kit/lab/news");
  });

  it("base='/' is the same as no base", () => {
    expect(pathFor("research", "/")).toBe("/research");
  });

  it("encodes unicode under a base", () => {
    expect(pathFor("プレゼン", "/cosense-site-kit")).toBe(
      "/cosense-site-kit/%E3%83%97%E3%83%AC%E3%82%BC%E3%83%B3",
    );
  });
});
