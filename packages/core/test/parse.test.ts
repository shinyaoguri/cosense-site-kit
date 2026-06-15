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

  it("keeps inline markup inside table cells (links survive, not flattened to text)", () => {
    const text = ["Title", "table:data", " name\t[Other Page]"].join("\n");
    const { blocks, pageLinks } = parseScrapboxText(text, "demo");
    const table = blocks.find((b) => b.type === "table");
    if (!table || table.type !== "table") throw new Error("expected table");
    // rows[r][c] is a cell = InlineNode[] (not a flattened string).
    const plainCell = table.rows[0]?.[0];
    expect(plainCell?.[0]).toEqual({ type: "text", value: "name" });
    const linkCell = table.rows[0]?.[1];
    expect(linkCell?.some((n) => n.type === "pageLink")).toBe(true);
    // A pageLink inside a cell is also collected into the page's link graph.
    expect(pageLinks).toContain("Other Page");
  });

  it("parses labeled external links and decorations inside table cells", () => {
    // The upstream parser leaves these as plain text in cells; core re-parses
    // each cell so they get the same inline support as body text.
    const text = [
      "Title",
      "table:data",
      " 外部リンク\t[https://astro.build Astro]",
      " 装飾\t[*/ 太字斜体]",
      " コード\t`npm i`",
    ].join("\n");
    const { blocks } = parseScrapboxText(text, "demo");
    const table = blocks.find((b) => b.type === "table");
    if (!table || table.type !== "table") throw new Error("expected table");

    const linkCell = table.rows[0]?.[1];
    const link = linkCell?.find((n) => n.type === "link");
    if (!link || link.type !== "link") throw new Error("expected a link in the cell");
    expect(link.href).toBe("https://astro.build");
    expect(link.children[0]).toEqual({ type: "text", value: "Astro" });

    const decoCell = table.rows[1]?.[1];
    // [*/ …] → strong wrapping emphasis (or emphasis wrapping strong).
    expect(JSON.stringify(decoCell)).toContain("strong");
    expect(JSON.stringify(decoCell)).toContain("emphasis");

    const codeCell = table.rows[2]?.[1];
    expect(codeCell?.[0]).toEqual({ type: "code", value: "npm i" });
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

  it("keeps the link on a standalone linked image ([url image-url])", () => {
    const { blocks } = parseScrapboxText(
      "Title\n[https://example.com/dest https://example.com/pic.png]",
      "demo",
    );
    expect(blocks[0]).toEqual({
      type: "image",
      url: "https://example.com/pic.png",
      href: "https://example.com/dest",
    });
  });

  it("renders helpfeel lines as inline code with the ? marker preserved", () => {
    const { blocks } = parseScrapboxText("Title\n? how do I deploy", "demo");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    expect(para.children).toEqual([{ type: "code", value: "? how do I deploy" }]);
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

  it("turns a bare YouTube URL on its own line into a youtube embed block", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "[https://www.youtube.com/watch?v=dQw4w9WgXcQ]",
    ]) {
      const { blocks } = parseScrapboxText(`T\n${url}`, "demo");
      const b = blocks[0];
      if (!b || b.type !== "embed") throw new Error(`expected embed for ${url}`);
      expect(b.kind).toBe("youtube");
      expect(b.url).toContain("dQw4w9WgXcQ");
    }
  });

  it("keeps a labeled YouTube link and an inline one as plain links (not embeds)", () => {
    const labeled = parseScrapboxText("T\n[https://youtu.be/dQw4w9WgXcQ My video]", "demo");
    expect(labeled.blocks.some((b) => b.type === "embed")).toBe(false);

    const inline = parseScrapboxText("T\nsee https://youtu.be/dQw4w9WgXcQ now", "demo");
    expect(inline.blocks.some((b) => b.type === "embed")).toBe(false);
  });

  it("tags a bare non-provider URL as a generic 'link' embed (theme resolves it)", () => {
    // core is provider-agnostic: a bare standalone URL becomes an embed block
    // with kind "link"; the theme's registry renders a player or falls back to
    // a plain link.
    const { blocks } = parseScrapboxText("T\nhttps://example.com/page", "demo");
    const b = blocks[0];
    if (!b || b.type !== "embed") throw new Error("expected embed block");
    expect(b.kind).toBe("link");
    expect(b.url).toBe("https://example.com/page");
  });

  it("turns a standalone Google Map notation into an embed block", () => {
    const { blocks } = parseScrapboxText("T\n[N35.681236,E139.767125,Z18 東京駅]", "demo");
    const b = blocks[0];
    if (!b || b.type !== "embed") throw new Error("expected embed block");
    expect(b.url).toContain("google.com/maps");
    expect(b.url).toContain("@35.681236,139.767125,18z");
  });

  it("keeps a Google Map notation mixed with text as an inline link", () => {
    const { blocks } = parseScrapboxText("T\nsee [N35.6,E139.7,Z18 Tokyo] here", "demo");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    const link = para.children.find((c) => c.type === "link");
    if (!link || link.type !== "link") throw new Error("expected inline link");
    expect(link.href).toContain("google.com/maps");
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

  it("flags [[name.icon]] (strongIcon) as a strong icon, plain [name.icon] not", () => {
    const { blocks } = parseScrapboxText("Title\n[foo.icon] [[foo.icon]]", "myproj");
    const para = blocks[0];
    if (!para || para.type !== "paragraph") throw new Error("expected paragraph");
    const icons = para.children.filter((c) => c.type === "icon");
    if (icons.length !== 2) throw new Error("expected two icons");
    const [plain, strong] = icons;
    if (plain?.type !== "icon" || strong?.type !== "icon") throw new Error("expected icons");
    expect(plain.strong).toBeUndefined();
    expect(strong.strong).toBe(true);
    // Same target/src — only the size differs.
    expect(strong.src).toBe(plain.src);
  });
});
