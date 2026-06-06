import { describe, expect, it } from "vitest";
import { buildIntermediate, defineCosenseSite } from "../src";
import { applyPublishRules } from "../src/publish/filter";
import { resolveLinkData } from "../src/resolve/backlinks";
import { resolveInternalLinks } from "../src/resolve/links";
import { assignSlugs } from "../src/resolve/slug";
import { normalizePage } from "../src/source/cosense/normalize";
import type { SiteSource, SourcePageRaw } from "../src/source/types";

function rawPage(
  o: Partial<SourcePageRaw> & { id: string; title: string; text: string },
): SourcePageRaw {
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
      normalizePage(rawPage({ id: "a", title: "A", text: "A\n#publish" }), "p"),
      normalizePage(rawPage({ id: "b", title: "B", text: "B\n#draft" }), "p"),
      normalizePage(rawPage({ id: "c", title: "C", text: "C\nno tags" }), "p"),
    ];
    const { kept, excluded } = applyPublishRules(pages, config.publish);
    expect(kept.map((p) => p.title)).toEqual(["A"]);
    expect(excluded.map((e) => e.title)).toEqual(["B", "C"]);
  });

  it("excludeTags override includeTags", () => {
    const pages = [
      normalizePage(rawPage({ id: "a", title: "A", text: "A\n#publish #draft" }), "p"),
    ];
    const { kept, excluded } = applyPublishRules(pages, config.publish);
    expect(kept).toHaveLength(0);
    expect(excluded[0]?.reason).toMatch(/draft/);
  });
});

describe("slug + link + backlink resolution", () => {
  it("assigns unique slugs and resolves internal pageLinks", () => {
    const pages = [
      normalizePage(
        rawPage({ id: "1", title: "Welcome", text: "Welcome\n#publish\nsee [Other]" }),
        "p",
      ),
      normalizePage(rawPage({ id: "2", title: "Other", text: "Other\n#publish\nbody" }), "p"),
    ];
    const slugged = assignSlugs(pages, { slug: "metadata-or-encoded-title" });
    expect(new Set(slugged.map((p) => p.slug)).size).toBe(2);

    const resolved = resolveInternalLinks(slugged);
    const welcome = resolved.find((p) => p.title === "Welcome");
    if (!welcome) throw new Error("missing");
    const links = welcome.blocks
      .flatMap((b) =>
        b.type === "paragraph" || b.type === "heading" || b.type === "list" ? b.children : [],
      )
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
        "p",
      ),
    ];
    const [slugged] = assignSlugs(pages, { slug: "metadata-or-encoded-title" });
    expect(slugged?.slug).toBe("research");
  });

  it("strips leading dots so dot-titled pages get a host-servable slug", () => {
    const pages = [
      normalizePage(rawPage({ id: "1", title: ".site page", text: ".site page\n#publish" }), "p"),
    ];
    const [slugged] = assignSlugs(pages, { slug: "encoded-title" });
    expect(slugged?.slug).toBe("site_page");
  });

  it("computes backlinks and slug-based link graph in one pass", () => {
    const pages = [
      normalizePage(rawPage({ id: "1", title: "A", text: "A\n#publish\nsee [B]" }), "p"),
      normalizePage(rawPage({ id: "2", title: "B", text: "B\n#publish" }), "p"),
    ];
    const slugged = assignSlugs(pages, { slug: "encoded-title" });
    const { pages: withBacklinks, linkGraph } = resolveLinkData(slugged);

    const b = withBacklinks.find((p) => p.title === "B");
    expect(b?.backlinks).toEqual(["A"]);

    const aSlug = slugged.find((p) => p.title === "A")?.slug;
    const bSlug = slugged.find((p) => p.title === "B")?.slug;
    expect(aSlug).toBeDefined();
    expect(bSlug).toBeDefined();
    if (aSlug && bSlug) expect(linkGraph[aSlug]).toEqual([bSlug]);
  });

  it("skips links to unpublished pages in both backlinks and link graph", () => {
    const pages = [
      normalizePage(rawPage({ id: "1", title: "A", text: "A\n#publish\nsee [Ghost]" }), "p"),
    ];
    const slugged = assignSlugs(pages, { slug: "encoded-title" });
    const { pages: out, linkGraph } = resolveLinkData(slugged);
    expect(out[0]?.backlinks).toEqual([]);
    expect(linkGraph[out[0]!.slug]).toEqual([]);
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

  it("still fetches every page when concurrency is NaN", async () => {
    // A bad --concurrency parsed to NaN once made the fetch loop never advance,
    // silently returning zero pages. Guard against that regression.
    const raws = [
      rawPage({ id: "a", title: "A", text: "A\n#publish" }),
      rawPage({ id: "b", title: "B", text: "B\n#publish" }),
    ];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });
    const data = await buildIntermediate({
      config,
      source: stubSource(raws),
      concurrency: Number.NaN,
    });
    expect(data.pages.map((p) => p.title).sort()).toEqual(["A", "B"]);
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
      '   page: "Home"',
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

  it("resolves page templates from tag and .site YAML mapping", async () => {
    const siteYaml = [".site", "code:site.yaml", " templates:", '   "Welcome": landing'].join("\n");
    const raws = [
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "h", title: "Welcome", text: "Welcome\n#publish" }),
      rawPage({ id: "a", title: "About", text: "About\n#publish\n#template/profile" }),
      rawPage({ id: "b", title: "Notes", text: "Notes\n#publish" }),
    ];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });
    const data = await buildIntermediate({ config, source: stubSource(raws) });
    const by = (t: string) => data.pages.find((p) => p.title === t)?.template;
    expect(by("Welcome")).toBe("landing"); // from YAML
    expect(by("About")).toBe("profile"); // from tag (beats YAML)
    expect(by("Notes")).toBe("page"); // default
  });

  it("surfaces drafts (flagged) only when previewDrafts is set", async () => {
    const raws = [
      rawPage({ id: "a", title: "Live", text: "Live\n#publish" }),
      rawPage({ id: "b", title: "WIP", text: "WIP\n#draft" }),
      rawPage({ id: "c", title: "Untagged", text: "Untagged\nno tags" }),
    ];
    const config = defineCosenseSite({
      site: { title: "T", baseUrl: "https://e.com" },
      source: { type: "cosense", project: "p" },
    });

    const normal = await buildIntermediate({ config, source: stubSource(raws) });
    expect(normal.pages.map((p) => p.title)).toEqual(["Live"]);

    const preview = await buildIntermediate({
      config,
      source: stubSource(raws),
      previewDrafts: true,
    });
    expect(preview.pages.map((p) => p.title).sort()).toEqual(["Live", "Untagged", "WIP"]);
    // Surfaced drafts are flagged; the published page is not.
    expect(preview.pages.find((p) => p.title === "Live")?.draft).toBeUndefined();
    expect(preview.pages.find((p) => p.title === "WIP")?.draft).toBe(true);
    // They still appear in `excluded` for doctor.
    expect(preview.excluded.map((e) => e.title).sort()).toEqual(["Untagged", "WIP"]);
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
