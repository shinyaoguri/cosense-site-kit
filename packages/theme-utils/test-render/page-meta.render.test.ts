import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import PageMeta from "../src/components/PageMeta.astro";

// PageMeta exists so `#no-date` is honoured structurally rather than by every
// theme remembering to call hidesDates() (#126). These render the real component
// through the Container API so the guarantee is checked at the markup level, not
// just in the pure helper.
describe("PageMeta rendering", () => {
  const published = "2026-05-20T09:30:00.000Z";
  const nextDay = "2026-05-21T09:30:00.000Z";

  const render = (props: Record<string, unknown>, slots?: Record<string, string>) =>
    AstroContainer.create().then((c) => c.renderToString(PageMeta, { props, slots }));

  it("renders both dates with machine-readable datetime attributes", async () => {
    const html = await render({ publishedAt: published, modifiedAt: nextDay });
    expect(html).toContain(`datetime="${published}"`);
    expect(html).toContain("2026-05-20");
    expect(html).toContain(`datetime="${nextDay}"`);
    expect(html).toContain("Updated 2026-05-21");
    expect(html).toMatch(/<div class="page-meta"/);
  });

  it("renders no dates for a page tagged #no-date", async () => {
    const html = await render({
      tags: ["no-date"],
      publishedAt: published,
      modifiedAt: nextDay,
    });
    expect(html).not.toContain("<time");
    expect(html).not.toContain("2026-05-2");
  });

  it("omits the row entirely when there is nothing to show", async () => {
    const html = await render({ tags: ["no-date"], publishedAt: published });
    expect(html.trim()).toBe("");
  });

  it("keeps slot content even when the dates are suppressed", async () => {
    // A card's tag chips must survive #no-date — only the dates opt out.
    const html = await render(
      { tags: ["no-date"], publishedAt: published },
      {
        default: '<span class="entry-tags">#diary</span>',
      },
    );
    expect(html).toContain("entry-tags");
    expect(html).not.toContain("<time");
  });

  it("drops the row when the slot renders to nothing", async () => {
    // EntryTags renders empty when a page has no public tags; the wrapper must
    // not survive as an empty flex row.
    const html = await render({ tags: ["no-date"] }, { default: "   " });
    expect(html.trim()).toBe("");
  });

  it("lets the theme name its own class hooks", async () => {
    const html = await render({
      publishedAt: published,
      class: "entry-meta",
      timeClass: "date",
      updatedLabel: "",
    });
    expect(html).toMatch(/<div class="entry-meta"/);
    expect(html).toMatch(/<time class="date"/);
  });
});
