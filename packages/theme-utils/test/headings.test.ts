import type { InlineNode } from "@cosense-site-kit/core";
import { describe, expect, it } from "vitest";
import { assignHeadingIds, headingText, slugifyHeading } from "../src/headings";

const text = (value: string): InlineNode => ({ type: "text", value });
const heading = (...children: InlineNode[]) => ({ children });

describe("headingText", () => {
  it("flattens nested inline nodes to plain text", () => {
    const nodes: InlineNode[] = [
      text("Hello "),
      { type: "strong", children: [text("world")] },
      { type: "pageLink", title: "Ref", exists: true },
    ];
    expect(headingText(nodes)).toBe("Hello worldRef");
  });
});

describe("slugifyHeading", () => {
  it("lowercases and hyphenates ascii", () => {
    expect(slugifyHeading("Getting Started!")).toBe("getting-started");
  });
  it("keeps unicode letters (Japanese headings stay readable)", () => {
    expect(slugifyHeading("はじめに")).toBe("はじめに");
  });
  it("falls back cleanly for punctuation-only text", () => {
    expect(slugifyHeading("!!!")).toBe("");
  });
});

describe("assignHeadingIds", () => {
  it("derives stable ids from text and de-duplicates collisions", () => {
    const a = heading(text("Setup"));
    const b = heading(text("Setup"));
    const c = heading(text("Usage"));
    const ids = assignHeadingIds([a, b, c]);
    expect(ids.get(a)).toBe("setup");
    expect(ids.get(b)).toBe("setup-2");
    expect(ids.get(c)).toBe("usage");
  });

  it("falls back to 'section' for an empty/punctuation heading", () => {
    const a = heading(text("???"));
    expect(assignHeadingIds([a]).get(a)).toBe("section");
  });
});
