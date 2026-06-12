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
