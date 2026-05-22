import type { CosenseBlock } from "@cosense-site-kit/core";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import PageContent from "../src/components/PageContent.astro";

// Smoke test for the rendering layer (block tree → HTML). The pure helpers are
// unit-tested elsewhere; this exercises the .astro glue (PageContent + Inline +
// ListTree + the embed registry) end to end via Astro's Container API, so a
// regression in the templates is caught without a full site build.
describe("PageContent rendering", () => {
  it("renders headings, prose, internal links, lists, images and embeds", async () => {
    const container = await AstroContainer.create();
    const blocks: CosenseBlock[] = [
      { type: "heading", depth: 1, children: [{ type: "text", value: "Hello" }] },
      {
        type: "paragraph",
        children: [
          { type: "text", value: "see " },
          { type: "pageLink", title: "Other", slug: "other", exists: true },
        ],
      },
      { type: "list", depth: 1, ordered: false, children: [{ type: "text", value: "item one" }] },
      { type: "image", url: "https://i.gyazo.com/x.png", alt: "" },
      { type: "embed", kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" },
    ];

    const html = await container.renderToString(PageContent, { props: { blocks } });

    // (Astro injects data-astro-source-* attributes in dev, so match tags
    // loosely rather than as exact strings.)
    // heading depth 1 → <h2>
    expect(html).toMatch(/<h2[^>]*>Hello<\/h2>/);
    // internal pageLink resolved to its slug + preview hook
    expect(html).toContain('href="/other"');
    expect(html).toContain('data-preview-slug="other"');
    // list folded into a <ul><li>
    expect(html).toMatch(/<ul>\s*<li[^>]*>/);
    expect(html).toContain("item one");
    // image carries perf attributes
    expect(html).toMatch(/<img[^>]*loading="lazy"/);
    expect(html).toMatch(/<img[^>]*decoding="async"/);
    // youtube embed resolved through the registry to a nocookie player
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(html).toContain('class="embed embed-youtube"');
  });

  it("renders a missing internal link as a non-link span", async () => {
    const container = await AstroContainer.create();
    const blocks: CosenseBlock[] = [
      {
        type: "paragraph",
        children: [{ type: "pageLink", title: "Ghost", exists: false }],
      },
    ];
    const html = await container.renderToString(PageContent, { props: { blocks } });
    expect(html).toContain("page-link missing");
    expect(html).not.toContain('href="/Ghost"');
  });
});
