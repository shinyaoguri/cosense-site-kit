import { describe, expect, it } from "vitest";
import { buildPreviewData } from "../src/preview-data";

describe("buildPreviewData", () => {
  it("keys previews by slug and carries title/summary/image", () => {
    const data = buildPreviewData([
      { slug: "a", title: "A", summary: "about a", image: "https://x/a.png" },
    ]);
    expect(data.a).toEqual({ title: "A", summary: "about a", image: "https://x/a.png" });
  });

  it("omits absent summary and image", () => {
    const data = buildPreviewData([{ slug: "b", title: "B" }]);
    expect(data.b).toEqual({ title: "B" });
    expect("summary" in data.b!).toBe(false);
    expect("image" in data.b!).toBe(false);
  });

  it("clips long summaries on a word boundary with an ellipsis", () => {
    const long = "word ".repeat(80).trim(); // 400+ chars of space-separated words
    const data = buildPreviewData([{ slug: "c", title: "C", summary: long }], { maxSummary: 50 });
    const s = data.c?.summary ?? "";
    expect(s.length).toBeLessThanOrEqual(51);
    expect(s.endsWith("…")).toBe(true);
    expect(s).not.toContain("  ");
  });

  it("does not over-trim spaceless (CJK) summaries", () => {
    const cjk = "あ".repeat(100);
    const data = buildPreviewData([{ slug: "d", title: "D", summary: cjk }], { maxSummary: 30 });
    const s = data.d?.summary ?? "";
    // 30 chars + ellipsis, not collapsed to almost nothing
    expect(s.length).toBe(31);
  });
});
