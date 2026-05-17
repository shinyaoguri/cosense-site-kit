import { describe, expect, it } from "vitest";
import {
  applyPublishRules,
  assignSlugs,
  buildIntermediate,
  buildLinkGraph,
  computeBacklinks,
  defineCosenseSite,
  normalizePage,
  resolveInternalLinks,
} from "../src";
import type { SiteSource, SourcePageRaw } from "../src/source/types";

function rawPage(o: Partial<SourcePageRaw> & { id: string; title: string; text: string }): SourcePageRaw {
  return {
    id: o.id,
    title: o.title,
    updated: 1_700_000_000,
    created: 1_600_000_000,
    text: o.text,
    links: o.links ?? [],
    image: null,
    descriptions: [],
    sourceUrl: `https://scrapbox.io/proj/${encodeURIComponent(o.title)}`,
  };
}

function stubSource(raws: SourcePageRaw[]): SiteSource {
  return {
    name: "stub",
    async list() {
      return raws.map((r) => ({
        id: r.id,
        title: r.title,
        updated: r.updated,
        sourceUrl: r.sourceUrl,
      }));
    },
    async fetch(ref) {
      const r = raws.find((x) => x.id === ref.id);
      if (!r) throw new Error(`missing ${ref.id}`);
      return r;
    },
  };
}

describe("applyPublishRules", () => {
  const config = defineCosenseSite({
    site: { title: "T", baseUrl: "https://e.com" },
    source: { type: "cosense", project: "p" },
  });

  it("includes pages with #publish and excludes pages with #draft", () => {
    const pages = [
      normalizePage(rawPage({ id: "a", title: "A", text: "A\n#publish" })),
      normalizePage(rawPage({ id: "b", title: "B", text: "B\n#draft" })),
      normalizePage(rawPage({ id: "c", title: "C", text: "C\nno tags" })),
    ];
    const { kept, excluded } = applyPublishRules(pages, config.publish);
    expect(kept.map((p) => p.title)).toEqual(["A"]);
    expect(excluded.map((e) => e.title)).toEqual(["B", "C"]);
  });

  it("excludeTags override includeTags", () => {
    const pages = [normalizePage(rawPage({ id: "a", title: "A", text: "A\n#publish #draft" }))];
    const { kept, excluded } = applyPublishRules(pages, config.publish);
    expect(kept).toHaveLength(0);
    expect(excluded[0]?.reason).toMatch(/draft/);
  });
});

describe("slug + link + backlink resolution", () => {
  it("assigns unique slugs and resolves internal pageLinks", () => {
    const pages = [
      normalizePage(rawPage({ id: "1", title: "Welcome", text: "Welcome\n#publish\nsee [Other]" })),
      normalizePage(rawPage({ id: "2", title: "Other", text: "Other\n#publish\nbody" })),
    ];
    const slugged = assignSlugs(pages, { slug: "metadata-or-encoded-title" });
    expect(new Set(slugged.map((p) => p.slug)).size).toBe(2);

    const resolved = resolveInternalLinks(slugged);
    const welcome = resolved.find((p) => p.title === "Welcome");
    if (!welcome) throw new Error("missing");
    const links = welcome.blocks
      .flatMap((b) => (b.type === "paragraph" || b.type === "heading" || b.type === "list" ? b.children : []))
      .filter((c) => c.type === "pageLink");
    expect(links).toHaveLength(1);
    const link = links[0];
    if (!link || link.type !== "pageLink") throw new Error("no link");
    expect(link.exists).toBe(true);
    expect(link.slug).toBeDefined();
  });

  it("uses #slug/xxx tag when strategy is metadata-or-encoded-title", () => {
    const pages = [
      normalizePage(
        rawPage({ id: "1", title: "研究テーマ", text: "研究テーマ\n#publish\n#slug/research" }),
      ),
    ];
    const [slugged] = assignSlugs(pages, { slug: "metadata-or-encoded-title" });
    expect(slugged?.slug).toBe("research");
  });

  it("computes backlinks", () => {
    const pages = [
      normalizePage(rawPage({ id: "1", title: "A", text: "A\n#publish\nsee [B]" })),
      normalizePage(rawPage({ id: "2", title: "B", text: "B\n#publish" })),
    ];
    const slugged = assignSlugs(pages, { slug: "encoded-title" });
    const withBacklinks = computeBacklinks(slugged);
    const b = withBacklinks.find((p) => p.title === "B");
    expect(b?.backlinks).toEqual(["A"]);
  });

  it("builds a slug -> slug link graph", () => {
    const pages = [
      normalizePage(rawPage({ id: "1", title: "A", text: "A\n#publish\nsee [B]" })),
      normalizePage(rawPage({ id: "2", title: "B", text: "B\n#publish" })),
    ];
    const slugged = assignSlugs(pages, { slug: "encoded-title" });
    const graph = buildLinkGraph(slugged);
    const aSlug = slugged.find((p) => p.title === "A")?.slug;
    const bSlug = slugged.find((p) => p.title === "B")?.slug;
    expect(aSlug).toBeDefined();
    expect(bSlug).toBeDefined();
    if (aSlug && bSlug) expect(graph[aSlug]).toEqual([bSlug]);
  });
});

describe("buildIntermediate", () => {
  it("runs the full pipeline with an injected source", async () => {
    const raws = [
      rawPage({ id: "a", title: "Home", text: "Home\n#publish\nhello [Sub]", links: ["Sub"] }),
      rawPage({ id: "b", title: "Sub", text: "Sub\n#publish\nbody" }),
      rawPage({ id: "c", title: "Hidden", text: "Hidden\nno publish" }),
    ];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });
    const data = await buildIntermediate({ config, source: stubSource(raws) });

    expect(data.schemaVersion).toBe("1");
    expect(data.pages.map((p) => p.title).sort()).toEqual(["Home", "Sub"]);
    expect(data.excluded.map((e) => e.title)).toContain("Hidden");

    const home = data.pages.find((p) => p.title === "Home");
    const sub = data.pages.find((p) => p.title === "Sub");
    expect(home && sub).toBeTruthy();
    if (home && sub) {
      expect(sub.backlinks).toEqual(["Home"]);
      expect(data.linkGraph[home.slug]).toEqual([sub.slug]);
    }
  });

  it("falls back to an empty SiteStructure when no site-config page exists", async () => {
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });
    const data = await buildIntermediate({
      config,
      source: stubSource([rawPage({ id: "a", title: "A", text: "A\n#publish" })]),
    });
    expect(data.structure.nav).toEqual([]);
    expect(data.structure.home).toBeUndefined();
    expect(data.warnings).toEqual([]);
  });

  it("parses .site YAML into IntermediateData.structure and excludes the page", async () => {
    const siteYaml = [
      ".site",
      "code:site.yaml",
      " home:",
      "   page: \"Home\"",
      " nav:",
      "   - { label: 'About', page: 'About' }",
      " posts:",
      "   tag: 'post'",
      "   limit: 5",
    ].join("\n");
    const raws = [
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "a", title: "Home", text: "Home\n#publish" }),
      rawPage({ id: "b", title: "About", text: "About\n#publish" }),
    ];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });
    const data = await buildIntermediate({ config, source: stubSource(raws) });

    expect(data.pages.map((p) => p.title).sort()).toEqual(["About", "Home"]);
    expect(data.excluded.find((e) => e.title === ".site")?.reason).toBe("site-config page");
    expect(data.structure.home?.page).toBe("Home");
    expect(data.structure.nav).toEqual([{ label: "About", page: "About" }]);
    expect(data.structure.posts?.tag).toBe("post");
    expect(data.structure.posts?.limit).toBe(5);
  });

  it("captures parse errors as warnings instead of aborting the build", async () => {
    const bad = [".site", "code:site.yaml", " nav: [ - { label: oops"].join("\n");
    const raws = [
      rawPage({ id: "s", title: ".site", text: bad }),
      rawPage({ id: "a", title: "A", text: "A\n#publish" }),
    ];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });
    const data = await buildIntermediate({ config, source: stubSource(raws) });

    expect(data.pages.map((p) => p.title)).toEqual(["A"]);
    expect(data.structure.nav).toEqual([]);
    expect(data.warnings.join(" ")).toMatch(/site\.yaml/);
  });

  it("respects siteConfig.page set to null (feature disabled)", async () => {
    const raws = [rawPage({ id: "s", title: ".site", text: ".site\ncode:site.yaml\n nav: []" })];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
      siteConfig: { page: null },
      publish: { default: "all" },
    });
    const data = await buildIntermediate({ config, source: stubSource(raws) });
    // With siteConfig disabled, .site is treated like any other page.
    expect(data.pages.map((p) => p.title)).toEqual([".site"]);
    expect(data.structure.nav).toEqual([]);
  });
});
