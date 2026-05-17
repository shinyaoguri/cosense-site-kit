import { describe, expect, it } from "vitest";
import {
  emptySiteStructure,
  parseSitePage,
  siteStructureSchema,
  SiteConfigParseError,
} from "../src";
import type { CosenseSitePage } from "../src";

function pageWith(blocks: CosenseSitePage["blocks"]): CosenseSitePage {
  return {
    schemaVersion: "1",
    id: "abc",
    title: ".site",
    slug: ".site",
    sourceUrl: "https://scrapbox.io/proj/.site",
    tags: [],
    links: [],
    backlinks: [],
    blocks,
  };
}

function codeBlock(filename: string, value: string): CosenseSitePage["blocks"][number] {
  return { type: "code", filename, value };
}

describe("parseSitePage", () => {
  it("returns null when no site.yaml block is present", () => {
    const page = pageWith([{ type: "paragraph", children: [{ type: "text", value: "hi" }] }]);
    expect(parseSitePage(page)).toBeNull();
  });

  it("parses a full site.yaml block", () => {
    const yaml = `
home:
  page: "ABOUT ME"

nav:
  - { label: "About", page: "ABOUT ME" }
  - { label: "GitHub", href: "https://github.com/x" }

posts:
  tag: "post"
  limit: 20
  route: "/posts"

featured:
  - "Top one"
  - "Top two"

redirects:
  legacy-about: about
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.warnings).toEqual([]);
    expect(result.structure.home?.page).toBe("ABOUT ME");
    expect(result.structure.nav).toHaveLength(2);
    expect(result.structure.posts?.tag).toBe("post");
    expect(result.structure.featured).toEqual(["Top one", "Top two"]);
    expect(result.structure.redirects).toEqual({ "legacy-about": "about" });
  });

  it("applies defaults for missing fields", () => {
    const result = parseSitePage(pageWith([codeBlock("site.yaml", "home:\n  page: Home")]));
    expect(result?.structure.nav).toEqual([]);
    expect(result?.structure.featured).toEqual([]);
    expect(result?.structure.redirects).toEqual({});
    expect(result?.structure.posts).toBeUndefined();
  });

  it("accepts site.yml as an alternative extension", () => {
    const result = parseSitePage(pageWith([codeBlock("site.yml", "featured: [a, b]")]));
    expect(result?.structure.featured).toEqual(["a", "b"]);
  });

  it("preserves unknown top-level keys via passthrough", () => {
    const yaml = "profile:\n  name: Shinya\n  affiliation: Lab\n";
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect((result?.structure as Record<string, unknown>).profile).toEqual({
      name: "Shinya",
      affiliation: "Lab",
    });
  });

  it("warns when multiple site.yaml blocks exist and uses the first", () => {
    const result = parseSitePage(
      pageWith([
        codeBlock("site.yaml", "featured: [first]"),
        codeBlock("site.yaml", "featured: [second]"),
      ]),
    );
    expect(result?.structure.featured).toEqual(["first"]);
    expect(result?.warnings.join(" ")).toMatch(/2 site\.yaml blocks/);
  });

  it("treats an empty YAML body as an empty structure", () => {
    const result = parseSitePage(pageWith([codeBlock("site.yaml", "")]));
    expect(result?.structure).toEqual(emptySiteStructure());
  });

  it("throws SiteConfigParseError on malformed YAML", () => {
    const result = () =>
      parseSitePage(pageWith([codeBlock("site.yaml", "nav: [\n  -")]));
    expect(result).toThrowError(SiteConfigParseError);
  });

  it("throws SiteConfigParseError when schema validation fails", () => {
    const yaml = "nav:\n  - { label: 'no page or href' }\n";
    expect(() => parseSitePage(pageWith([codeBlock("site.yaml", yaml)]))).toThrowError(
      SiteConfigParseError,
    );
  });

  it("rejects nav.href that is not a URL", () => {
    const yaml = "nav:\n  - { label: 'x', href: 'not a url' }\n";
    expect(() => parseSitePage(pageWith([codeBlock("site.yaml", yaml)]))).toThrowError(
      SiteConfigParseError,
    );
  });
});

describe("siteStructureSchema defaults", () => {
  it("emptySiteStructure() produces sensible defaults", () => {
    const empty = emptySiteStructure();
    expect(empty.nav).toEqual([]);
    expect(empty.featured).toEqual([]);
    expect(empty.redirects).toEqual({});
    expect(empty.home).toBeUndefined();
    expect(empty.posts).toBeUndefined();
  });

  it("siteStructureSchema rejects unknown nav variants", () => {
    expect(() =>
      siteStructureSchema.parse({ nav: [{ label: "x" }] }),
    ).toThrow();
  });
});
