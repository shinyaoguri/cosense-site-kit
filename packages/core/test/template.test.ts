import { describe, expect, it } from "vitest";
import type { CosenseSitePage, SiteStructure } from "../src";
import { assignTemplates, DEFAULT_TEMPLATE, resolveTemplate } from "../src/resolve/template";
import { emptySiteStructure } from "../src/schema/v1/site-structure";

function page(o: { title?: string; tags?: string[] } = {}): CosenseSitePage {
  return {
    schemaVersion: "1",
    id: "x",
    title: o.title ?? "X",
    slug: "x",
    sourceUrl: "https://scrapbox.io/proj/X",
    template: "page",
    tags: o.tags ?? [],
    links: [],
    backlinks: [],
    blocks: [],
  };
}

function structureWith(templates: SiteStructure["templates"] = {}): SiteStructure {
  return { ...emptySiteStructure(), templates };
}

describe("resolveTemplate", () => {
  it("defaults to 'page' when no signal is present", () => {
    expect(resolveTemplate(page(), structureWith())).toBe(DEFAULT_TEMPLATE);
  });

  it("uses a #template/<name> tag when one is set", () => {
    const p = page({ tags: ["publish", "template/profile"] });
    expect(resolveTemplate(p, structureWith())).toBe("profile");
  });

  it("uses the .site YAML mapping when no tag is set", () => {
    const p = page({ title: "About Me", tags: ["publish"] });
    const s = structureWith({ "About Me": "profile" });
    expect(resolveTemplate(p, s)).toBe("profile");
  });

  it("tag wins over .site mapping when both apply", () => {
    const p = page({ title: "About Me", tags: ["publish", "template/landing"] });
    const s = structureWith({ "About Me": "profile" });
    expect(resolveTemplate(p, s)).toBe("landing");
  });

  it("ignores an empty #template/ tag", () => {
    const p = page({ tags: ["template/"] });
    expect(resolveTemplate(p, structureWith())).toBe(DEFAULT_TEMPLATE);
  });

  it("preserves nested template paths like #template/lab/member", () => {
    const p = page({ tags: ["template/lab/member"] });
    expect(resolveTemplate(p, structureWith())).toBe("lab/member");
  });

  it("matches a case-variant #Template/<name> tag", () => {
    const p = page({ tags: ["publish", "Template/Profile"] });
    // Prefix matches case-insensitively; the value after the prefix is kept raw.
    expect(resolveTemplate(p, structureWith())).toBe("Profile");
  });

  it("matches the .site mapping case-insensitively", () => {
    // Cosense titles are case-insensitive, so `templates: { Home: ... }` must
    // still hit the page "home".
    const p = page({ title: "home", tags: ["publish"] });
    const s = structureWith({ Home: "landing" });
    expect(resolveTemplate(p, s)).toBe("landing");
  });

  it("does not resolve a prototype-key title to an inherited member", () => {
    // `structure.templates[title]` would return Object.prototype.constructor (a
    // function) for a page titled "constructor", breaking the string contract.
    // Object.entries-based matching only sees own keys, so it falls back.
    for (const title of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const p = page({ title, tags: ["publish"] });
      expect(resolveTemplate(p, structureWith())).toBe(DEFAULT_TEMPLATE);
    }
  });

  it("returns a prototype-name #template tag verbatim as a plain string", () => {
    // The name is data, not a lookup, so it stays a string; the theme dispatcher
    // is responsible for guarding its own registry lookup.
    const p = page({ tags: ["publish", "template/constructor"] });
    const t = resolveTemplate(p, structureWith());
    expect(t).toBe("constructor");
    expect(typeof t).toBe("string");
  });
});

describe("assignTemplates", () => {
  it("returns a new array with each page's template filled in", () => {
    const pages = [
      page({ title: "Home", tags: ["publish"] }),
      page({ title: "About", tags: ["publish", "template/profile"] }),
      page({ title: "Welcome", tags: ["publish"] }),
    ];
    const s = structureWith({ Welcome: "landing" });
    const out = assignTemplates(pages, s);
    expect(out.map((p) => `${p.title}:${p.template}`)).toEqual([
      "Home:page",
      "About:profile",
      "Welcome:landing",
    ]);
    // input not mutated
    expect(pages.every((p) => p.template === "page")).toBe(true);
  });
});
