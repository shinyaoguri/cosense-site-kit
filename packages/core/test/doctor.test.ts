import { describe, expect, it } from "vitest";
import { defineCosenseSite, runDoctor } from "../src";
import type { CosenseSiteConfig } from "../src";
import type { SiteSource, SourcePageRaw } from "../src/source/types";

function rawPage(o: { id: string; title: string; text: string; links?: string[] }): SourcePageRaw {
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

const baseConfig = (over: Partial<Parameters<typeof defineCosenseSite>[0]> = {}): CosenseSiteConfig =>
  defineCosenseSite({
    site: { title: "T", baseUrl: "https://e.com" },
    source: { type: "cosense", project: "p" },
    ...over,
  });

function find(report: Awaited<ReturnType<typeof runDoctor>>, name: string) {
  const c = report.checks.find((c) => c.name === name);
  if (!c) throw new Error(`check "${name}" not found`);
  return c;
}

describe("runDoctor", () => {
  it("passes on a healthy publish set", async () => {
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "a", title: "Home", text: "Home\n#publish\nhello" }),
      rawPage({ id: "b", title: "About", text: "About\n#publish\nbody" }),
    ]);
    const report = await runDoctor({ config, source });
    expect(report.ok).toBe(true);
    expect(find(report, "Publish rules produce pages").status).toBe("pass");
  });

  it("fails when publish rules produce zero pages", async () => {
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "a", title: "A", text: "A\nno tags" }),
    ]);
    const report = await runDoctor({ config, source });
    expect(report.ok).toBe(false);
    expect(find(report, "Publish rules produce pages").status).toBe("fail");
  });

  it("fails when a nav reference does not resolve", async () => {
    const siteYaml = [
      ".site",
      "code:site.yaml",
      " nav:",
      "   - { label: 'About', page: 'About' }",
    ].join("\n");
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "a", title: "Home", text: "Home\n#publish" }),
    ]);
    const report = await runDoctor({ config, source });
    expect(report.ok).toBe(false);
    const check = find(report, "Nav references resolve");
    expect(check.status).toBe("fail");
    expect(check.details?.[0]).toContain("About");
  });

  it("fails when home.page does not resolve", async () => {
    const siteYaml = [".site", "code:site.yaml", " home:", "   page: Missing"].join("\n");
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "a", title: "Home", text: "Home\n#publish" }),
    ]);
    const report = await runDoctor({ config, source });
    expect(find(report, "Home reference resolves").status).toBe("fail");
    expect(report.ok).toBe(false);
  });

  it("warns when featured page is not published", async () => {
    const siteYaml = [
      ".site",
      "code:site.yaml",
      " featured:",
      "   - 'Hidden'",
      "   - 'Visible'",
    ].join("\n");
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "a", title: "Visible", text: "Visible\n#publish" }),
      rawPage({ id: "b", title: "Hidden", text: "Hidden\nno tags" }),
    ]);
    const report = await runDoctor({ config, source });
    const check = find(report, "Featured references resolve");
    expect(check.status).toBe("warn");
    expect(check.details?.[0]).toContain("Hidden");
  });

  it("warns when posts.tag has no matching pages", async () => {
    const siteYaml = [".site", "code:site.yaml", " posts:", "   tag: blog"].join("\n");
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "a", title: "Home", text: "Home\n#publish" }),
    ]);
    const report = await runDoctor({ config, source });
    expect(find(report, "Posts tag has content").status).toBe("warn");
  });

  it("warns about broken internal page links", async () => {
    const config = baseConfig();
    const source = stubSource([
      rawPage({
        id: "a",
        title: "Home",
        text: "Home\n#publish\nsee [Ghost] and [Visible]",
      }),
      rawPage({ id: "b", title: "Visible", text: "Visible\n#publish" }),
    ]);
    const report = await runDoctor({ config, source });
    const check = find(report, "Internal page links resolve");
    expect(check.status).toBe("warn");
    expect(check.message).toMatch(/1 broken/);
  });

  it("warns when a redirect destination is missing", async () => {
    const siteYaml = [
      ".site",
      "code:site.yaml",
      " redirects:",
      "   legacy: missing-target",
      "   another: Home",
    ].join("\n");
    const config = baseConfig();
    const source = stubSource([
      rawPage({ id: "s", title: ".site", text: siteYaml }),
      rawPage({ id: "h", title: "Home", text: "Home\n#publish" }),
    ]);
    const report = await runDoctor({ config, source });
    const check = find(report, "Redirect destinations exist");
    expect(check.status).toBe("warn");
    expect(check.details?.[0]).toMatch(/legacy.*missing-target/);
  });

  it("reports site-config page disabled when set to null", async () => {
    const config = baseConfig({ siteConfig: { page: null } });
    const source = stubSource([rawPage({ id: "a", title: "A", text: "A\n#publish" })]);
    const report = await runDoctor({ config, source });
    expect(find(report, "Site-config page").message).toMatch(/disabled/);
  });

  it("captures pipeline failures as fatalError", async () => {
    const config = baseConfig();
    const explodingSource: SiteSource = {
      name: "explode",
      async list() {
        throw new Error("Cosense API 503");
      },
      async fetch() {
        throw new Error("unused");
      },
    };
    const report = await runDoctor({ config, source: explodingSource });
    expect(report.ok).toBe(false);
    expect(report.fatalError).toMatch(/503/);
    expect(report.checks).toEqual([]);
  });
});
