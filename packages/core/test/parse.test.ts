import { describe, expect, it } from "vitest";
import { parseScrapboxText } from "../src/parse/scrapbox";

describe("parseScrapboxText", () => {
  it("extracts the title from the first line", () => {
    const result = parseScrapboxText("Welcome\nbody");
    expect(result.title).toBe("Welcome");
  });

  it("converts a plain body line into a paragraph", () => {
    const { blocks } = parseScrapboxText("Title\nhello world");
    expect(blocks).toEqual([
      { type: "paragraph", children: [{ type: "text", value: "hello world" }] },
    ]);
  });

  it("collects hashtags", () => {
    const { tags } = parseScrapboxText("Title\n#publish #lab/news intro");
    expect(tags).toEqual(["publish", "lab/news"]);
  });

  it("collects internal page links", () => {
    const { pageLinks, blocks } = parseScrapboxText("Title\nsee [Other Page] for more");
    expect(pageLinks).toEqual(["Other Page"]);
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    expect(para.children.some((c) => c.type === "pageLink")).toBe(true);
  });

  it("emits a code block", () => {
    const text = ["Title", "code:demo.ts", " export const x = 1;", " export const y = 2;"].join(
      "\n",
    );
    const { blocks } = parseScrapboxText(text);
    const code = blocks.find((b) => b.type === "code");
    expect(code).toBeTruthy();
    if (code && code.type === "code") {
      expect(code.filename).toBe("demo.ts");
      expect(code.lang).toBe("ts");
      expect(code.value).toContain("export const x = 1;");
    }
  });

  it("treats indented lines as list items", () => {
    const { blocks } = parseScrapboxText("Title\n one\n two");
    expect(blocks.map((b) => b.type)).toEqual(["list", "list"]);
  });

  it("converts [*** heading] to a heading block with depth 2", () => {
    const { blocks } = parseScrapboxText("Title\n[*** Section]");
    const h = blocks[0];
    if (!h || h.type !== "heading") throw new Error("expected heading");
    expect(h.depth).toBe(2);
  });

  it("keeps inline [* bold] as a strong run inside a paragraph", () => {
    const { blocks } = parseScrapboxText("Title\nhello [* there] world");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    expect(para.children.some((c) => c.type === "strong")).toBe(true);
  });
});
