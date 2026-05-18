import { describe, expect, it } from "vitest";
import type { CosenseBlock } from "@cosense-site-kit/core";
import {
  DEFAULT_CV_ORDER,
  effectiveOrder,
  extractCv,
  renderInlineLinks,
} from "../src/lib/cv";

function codeBlock(filename: string, value: string): CosenseBlock {
  return { type: "code", filename, value };
}

describe("extractCv", () => {
  it("returns null when there is no cv.yaml block", () => {
    const blocks: CosenseBlock[] = [
      { type: "paragraph", children: [{ type: "text", value: "hi" }] },
    ];
    expect(extractCv(blocks)).toBeNull();
  });

  it("parses a minimal cv.yaml block", () => {
    const yaml = `
education:
  - period: "2018.04 - 2021.09"
    title: "Nagoya University"
career:
  - period: "2023.04 - 現在"
    title: "AIT"
    description: "Lecturer"
`;
    const cv = extractCv([codeBlock("cv.yaml", yaml)]);
    expect(cv?.education).toHaveLength(1);
    expect(cv?.career?.[0]?.description).toBe("Lecturer");
  });

  it("accepts publications with peerReviewed/fullPaper flags", () => {
    const yaml = `
publications:
  - year: 2020.12
    authors: "OGURI"
    title: "Foo"
    source: "Bar Journal"
    url: "https://example.com"
    peerReviewed: true
    fullPaper: true
`;
    const cv = extractCv([codeBlock("cv.yaml", yaml)]);
    const pub = cv?.publications?.[0];
    expect(pub?.peerReviewed).toBe(true);
    expect(pub?.fullPaper).toBe(true);
  });

  it("returns null and does not throw on malformed YAML", () => {
    const cv = extractCv([codeBlock("cv.yaml", ":\n  -invalid yaml: [")]);
    expect(cv).toBeNull();
  });

  it("ignores other named code blocks", () => {
    const cv = extractCv([codeBlock("site.yaml", "site:\n  title: X")]);
    expect(cv).toBeNull();
  });
});

describe("effectiveOrder", () => {
  it("falls back to DEFAULT_CV_ORDER when sectionOrder is absent", () => {
    expect(effectiveOrder({})).toEqual(DEFAULT_CV_ORDER);
  });

  it("honors sectionOrder when provided", () => {
    expect(
      effectiveOrder({ sectionOrder: ["career", "publications"] }),
    ).toEqual(["career", "publications"]);
  });
});

describe("renderInlineLinks", () => {
  it("converts [label](url) into anchor tags", () => {
    expect(renderInlineLinks("see [docs](https://example.com)")).toBe(
      'see <a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a>',
    );
  });

  it("escapes HTML in surrounding text", () => {
    expect(renderInlineLinks("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("escapes HTML inside the link label and href", () => {
    expect(renderInlineLinks('[a&b](http://x?q="y")')).toContain(
      'href="http://x?q=&quot;y&quot;"',
    );
    expect(renderInlineLinks("[a&b](http://x)")).toContain(">a&amp;b<");
  });

  it("returns empty string for undefined input", () => {
    expect(renderInlineLinks(undefined)).toBe("");
  });

  it("handles multiple links in one string", () => {
    const html = renderInlineLinks("[a](http://a) and [b](http://b)");
    expect(html).toContain('href="http://a"');
    expect(html).toContain('href="http://b"');
  });
});
