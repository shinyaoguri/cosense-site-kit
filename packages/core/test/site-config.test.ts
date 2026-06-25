import { describe, expect, it } from "vitest";
import type { CosenseSitePage } from "../src";
import { parseSitePage, SiteConfigParseError } from "../src/parse/site-config";
import { emptySiteStructure, siteStructureSchema } from "../src/schema/v1/site-structure";

function pageWith(blocks: CosenseSitePage["blocks"]): CosenseSitePage {
  return {
    schemaVersion: "1",
    id: "abc",
    title: ".site",
    slug: ".site",
    sourceUrl: "https://scrapbox.io/proj/.site",
    template: "page",
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

  it("treats an empty list field as its default without discarding the rest", () => {
    // The reported bug: `featured:` left blank parses to `featured: null`, which
    // failed array validation and discarded the whole block (home, nav, ...).
    const yaml = `
home:
  page: Welcome
nav:
  - { label: "About", page: "About" }
featured:
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.structure.home?.page).toBe("Welcome");
    expect(result.structure.nav).toHaveLength(1);
    expect(result.structure.featured).toEqual([]);
  });

  it("treats every blank field as its default / absent", () => {
    const yaml = `
home:
nav:
posts:
featured:
redirects:
templates:
favicon:
theme:
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.structure.home).toBeUndefined();
    expect(result.structure.posts).toBeUndefined();
    expect(result.structure.favicon).toBeUndefined();
    expect(result.structure.nav).toEqual([]);
    expect(result.structure.featured).toEqual([]);
    expect(result.structure.redirects).toEqual({});
    expect(result.structure.templates).toEqual({});
    expect((result.structure as Record<string, unknown>).theme).toBeUndefined();
  });

  it("treats a section with only blank sub-fields as absent", () => {
    // `home:` present but its required `page:` left blank — drop the whole
    // section rather than error on the missing required key.
    const yaml = `
home:
  page:
nav:
  - { label: "About", page: "About" }
theme:
  skin:
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.structure.home).toBeUndefined();
    expect((result.structure as Record<string, unknown>).theme).toBeUndefined();
    expect(result.structure.nav).toHaveLength(1);
  });

  it("drops blank entries inside a list", () => {
    const yaml = "featured:\n  - Top\n  -\n  - Second\n";
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result?.structure.featured).toEqual(["Top", "Second"]);
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

  it("warns when nav is indented under home (the reported silent failure)", () => {
    const yaml = `
home:
  page: Welcome
  nav:
    - { label: "About", page: "About" }
    - { label: "News", href: "/news" }
posts:
  tag: news
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result).not.toBeNull();
    if (!result) return;
    // Non-fatal: the config still applies, nav is just (silently) empty.
    expect(result.structure.home?.page).toBe("Welcome");
    expect(result.structure.nav).toEqual([]);
    // ...but now there is a warning pointing at the mistake.
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.join("\n")).toMatch(/"home:".*"nav"/);
    expect(result.warnings.join("\n")).toMatch(/top level/i);
  });

  it("warns on a misspelled/misplaced top-level key", () => {
    const yaml = `
navigation:
  - { label: "About", page: "About" }
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result?.warnings.join("\n")).toMatch(/unknown top-level key "navigation"/);
    expect(result?.warnings.join("\n")).toMatch(/did you mean "nav"/);
    // The nav itself stays empty since `navigation` isn't a real key.
    expect(result?.structure.nav).toEqual([]);
  });

  it("warns on unknown keys inside home", () => {
    const result = parseSitePage(
      pageWith([codeBlock("site.yaml", "home:\n  page: Home\n  foo: bar\n")]),
    );
    expect(result?.structure.home?.page).toBe("Home");
    expect(result?.warnings.join("\n")).toMatch(/"home:".*"foo"/);
  });

  it("does not warn on genuinely custom top-level sections (passthrough)", () => {
    const yaml = "profile:\n  name: Shinya\nmembers:\n  - Alice\n";
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result?.warnings).toEqual([]);
    expect((result?.structure as Record<string, unknown>).profile).toEqual({ name: "Shinya" });
  });

  it("does not warn on a correct config (no false positives)", () => {
    const yaml = `
home:
  page: Welcome
nav:
  - { label: "About", page: "About" }
  - { label: "News", href: "/news" }
posts:
  tag: news
`;
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result?.warnings).toEqual([]);
    expect(result?.structure.nav).toHaveLength(2);
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
    const result = () => parseSitePage(pageWith([codeBlock("site.yaml", "nav: [\n  -")]));
    expect(result).toThrowError(SiteConfigParseError);
  });

  it("throws SiteConfigParseError when schema validation fails", () => {
    const yaml = "nav:\n  - { label: 'no page or href' }\n";
    expect(() => parseSitePage(pageWith([codeBlock("site.yaml", yaml)]))).toThrowError(
      SiteConfigParseError,
    );
  });

  it("accepts site-relative paths in nav.href (for theme-injected routes)", () => {
    const yaml = "nav:\n  - { label: 'Blog', href: '/blog' }\n";
    const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
    expect(result?.structure.nav[0]).toEqual({ label: "Blog", href: "/blog" });
  });

  it("rejects empty nav.href", () => {
    const yaml = "nav:\n  - { label: 'x', href: '' }\n";
    expect(() => parseSitePage(pageWith([codeBlock("site.yaml", yaml)]))).toThrowError(
      SiteConfigParseError,
    );
  });

  it("rejects script-capable and protocol-relative nav.href schemes", () => {
    // .site is remote input; Astro's attribute escaping can't neutralize a
    // javascript: href, so the schema must.
    for (const href of ["javascript:alert(1)", "data:text/html,x", "//evil.example/x"]) {
      const yaml = `nav:\n  - { label: 'x', href: '${href}' }\n`;
      expect(() => parseSitePage(pageWith([codeBlock("site.yaml", yaml)]))).toThrowError(
        SiteConfigParseError,
      );
    }
  });

  it("accepts mailto:/tel:/fragment nav.href", () => {
    for (const href of ["mailto:me@example.com", "tel:+81-3-0000-0000", "#about"]) {
      const yaml = `nav:\n  - { label: 'x', href: '${href}' }\n`;
      const result = parseSitePage(pageWith([codeBlock("site.yaml", yaml)]));
      expect(result?.structure.nav[0]).toEqual({ label: "x", href });
    }
  });

  it("rejects external-URL redirect destinations (no open redirects)", () => {
    for (const to of ["https://evil.example/", "//evil.example/x", "javascript:alert(1)"]) {
      const yaml = `redirects:\n  old: "${to}"\n`;
      expect(() => parseSitePage(pageWith([codeBlock("site.yaml", yaml)]))).toThrowError(
        SiteConfigParseError,
      );
    }
    const ok = parseSitePage(pageWith([codeBlock("site.yaml", "redirects:\n  old: new-slug\n")]));
    expect(ok?.structure.redirects).toEqual({ old: "new-slug" });
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
    expect(() => siteStructureSchema.parse({ nav: [{ label: "x" }] })).toThrow();
  });
});
