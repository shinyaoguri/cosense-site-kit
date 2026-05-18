import { describe, expect, it } from "vitest";
import {
  blockSchema,
  defineCosenseSite,
  inlineNodeSchema,
  pageSchema,
  SCHEMA_VERSION,
} from "../src";

describe("inline node schema", () => {
  it("accepts a plain text node", () => {
    expect(inlineNodeSchema.parse({ type: "text", value: "hello" })).toEqual({
      type: "text",
      value: "hello",
    });
  });

  it("accepts a nested strong with a link inside", () => {
    const node = {
      type: "strong",
      children: [
        { type: "text", value: "see " },
        {
          type: "link",
          href: "https://example.com",
          children: [{ type: "text", value: "example" }],
        },
      ],
    } as const;
    expect(inlineNodeSchema.parse(node)).toEqual(node);
  });

  it("rejects an unknown inline type", () => {
    expect(() => inlineNodeSchema.parse({ type: "blink", value: "x" })).toThrow();
  });
});

describe("block schema", () => {
  it("accepts a heading", () => {
    expect(
      blockSchema.parse({
        type: "heading",
        depth: 2,
        children: [{ type: "text", value: "Section" }],
      }),
    ).toMatchObject({ type: "heading", depth: 2 });
  });

  it("accepts a code block", () => {
    expect(
      blockSchema.parse({
        type: "code",
        filename: "snippet.ts",
        lang: "ts",
        value: "export const x = 1;",
      }),
    ).toMatchObject({ type: "code", filename: "snippet.ts" });
  });

  it("rejects a heading with depth 4", () => {
    expect(() =>
      blockSchema.parse({ type: "heading", depth: 4, children: [] }),
    ).toThrow();
  });
});

describe("page schema", () => {
  it("validates a minimal page", () => {
    const page = pageSchema.parse({
      schemaVersion: "1",
      id: "abc",
      title: "Home",
      slug: "home",
      sourceUrl: "https://scrapbox.io/proj/Home",
      template: "page",
      tags: [],
      links: [],
      backlinks: [],
      blocks: [],
    });
    expect(page.schemaVersion).toBe(SCHEMA_VERSION);
    expect(page.template).toBe("page");
  });

  it("rejects a non-url sourceUrl", () => {
    expect(() =>
      pageSchema.parse({
        schemaVersion: "1",
        id: "abc",
        title: "Home",
        slug: "home",
        sourceUrl: "not-a-url",
        template: "page",
        tags: [],
        links: [],
        backlinks: [],
        blocks: [],
      }),
    ).toThrow();
  });

  it("rejects an empty template name", () => {
    expect(() =>
      pageSchema.parse({
        schemaVersion: "1",
        id: "abc",
        title: "Home",
        slug: "home",
        sourceUrl: "https://scrapbox.io/proj/Home",
        template: "",
        tags: [],
        links: [],
        backlinks: [],
        blocks: [],
      }),
    ).toThrow();
  });
});

describe("defineCosenseSite", () => {
  it("applies publish/routing defaults", () => {
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://example.com" },
      source: { type: "cosense", project: "my-proj" },
    });
    expect(config.site.lang).toBe("ja");
    expect(config.publish.default).toBe("none");
    expect(config.publish.includeTags).toEqual(["publish"]);
    expect(config.publish.excludeTags).toEqual(["draft", "private", "internal"]);
    expect(config.routing.slug).toBe("metadata-or-encoded-title");
  });

  it("rejects an empty project", () => {
    expect(() =>
      defineCosenseSite({
        site: { title: "T", baseUrl: "https://example.com" },
        source: { type: "cosense", project: "" },
      }),
    ).toThrow();
  });
});
