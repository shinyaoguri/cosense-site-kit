import { describe, expect, it } from "vitest";
import { parseScrapboxText } from "../src/parse/scrapbox";

describe("parseScrapboxText", () => {
  it("extracts the title from the first line", () => {
    const result = parseScrapboxText("Welcome\nbody", "demo");
    expect(result.title).toBe("Welcome");
  });

  it("converts a plain body line into a paragraph", () => {
    const { blocks } = parseScrapboxText("Title\nhello world", "demo");
    expect(blocks).toEqual([
      { type: "paragraph", children: [{ type: "text", value: "hello world" }] },
    ]);
  });

  it("collects hashtags", () => {
    const { tags } = parseScrapboxText("Title\n#publish #lab/news intro", "demo");
    expect(tags).toEqual(["publish", "lab/news"]);
  });

  it("collects internal page links", () => {
    const { pageLinks, blocks } = parseScrapboxText("Title\nsee [Other Page] for more", "demo");
    expect(pageLinks).toEqual(["Other Page"]);
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    expect(para.children.some((c) => c.type === "pageLink")).toBe(true);
  });

  it("emits a code block", () => {
    const text = ["Title", "code:demo.ts", " export const x = 1;", " export const y = 2;"].join(
      "\n",
    );
    const { blocks } = parseScrapboxText(text, "demo");
    const code = blocks.find((b) => b.type === "code");
    expect(code).toBeTruthy();
    if (code && code.type === "code") {
      expect(code.filename).toBe("demo.ts");
      expect(code.lang).toBe("ts");
      expect(code.value).toContain("export const x = 1;");
    }
  });

  it("treats indented lines as list items", () => {
    const { blocks } = parseScrapboxText("Title\n one\n two", "demo");
    expect(blocks.map((b) => b.type)).toEqual(["list", "list"]);
  });

  it("converts a standalone image line into an image block and collects it", () => {
    const { blocks, images } = parseScrapboxText("Title\n[https://example.com/pic.png]", "demo");
    expect(blocks[0]).toEqual({ type: "image", url: "https://example.com/pic.png" });
    expect(images).toEqual(["https://example.com/pic.png"]);
  });

  it("emits an inline image node for an image mixed with text (not a text link)", () => {
    const { blocks } = parseScrapboxText(
      "Title\nbefore [https://example.com/pic.png] after",
      "demo",
    );
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    const img = para.children.find((c) => c.type === "image");
    if (!img || img.type !== "image") throw new Error("expected inline image");
    expect(img.src).toBe("https://example.com/pic.png");
  });

  it("converts a > quote line into a quote block", () => {
    const { blocks } = parseScrapboxText("Title\n> a wise saying", "demo");
    const q = blocks[0];
    if (!q || q.type !== "quote") throw new Error("expected quote");
    expect(q.children).toEqual([{ type: "text", value: " a wise saying" }]);
  });

  it("converts a numbered line into an ordered list item", () => {
    const { blocks } = parseScrapboxText("Title\n1. first\n2. second", "demo");
    expect(blocks.every((b) => b.type === "list" && b.ordered === true)).toBe(true);
    const first = blocks[0];
    if (!first || first.type !== "list") throw new Error("expected list");
    expect(first.children).toEqual([{ type: "text", value: "first" }]);
  });

  it("converts [*** heading] to a heading block with depth 2", () => {
    const { blocks } = parseScrapboxText("Title\n[*** Section]", "demo");
    const h = blocks[0];
    if (!h || h.type !== "heading") throw new Error("expected heading");
    expect(h.depth).toBe(2);
  });

  it("keeps inline [* bold] as a strong run inside a paragraph", () => {
    const { blocks } = parseScrapboxText("Title\nhello [* there] world", "demo");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    expect(para.children.some((c) => c.type === "strong")).toBe(true);
  });

  it("resolves a relative icon to the current project", () => {
    const { blocks } = parseScrapboxText("Title\n[foo.icon]", "myproj");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    const icon = para.children.find((c) => c.type === "icon");
    if (!icon || icon.type !== "icon") throw new Error("expected icon");
    expect(icon.pageTitle).toBe("foo");
    expect(icon.project).toBe("myproj");
    expect(icon.src).toBe("https://scrapbox.io/api/pages/myproj/foo/icon");
  });

  it("resolves a root-path icon to its declared project", () => {
    const { blocks } = parseScrapboxText("Title\n[/other/bar baz.icon]", "myproj");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    const icon = para.children.find((c) => c.type === "icon");
    if (!icon || icon.type !== "icon") throw new Error("expected icon");
    expect(icon.project).toBe("other");
    expect(icon.pageTitle).toBe("bar baz");
    expect(icon.src).toBe("https://scrapbox.io/api/pages/other/bar%20baz/icon");
  });
});
