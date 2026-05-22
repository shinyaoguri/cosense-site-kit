import { describe, expect, it } from "vitest";
import { isStructuralLink, type RelatedCandidate, relatedPages } from "../src/related";

const c = (title: string, links: string[]): RelatedCandidate => ({
  title,
  slug: title.toLowerCase().replace(/\s+/g, "-"),
  links,
});

describe("isStructuralLink", () => {
  it("flags control tags and namespaced metadata, not real topics", () => {
    expect(isStructuralLink("publish")).toBe(true);
    expect(isStructuralLink("draft")).toBe(true);
    expect(isStructuralLink("published/2024-01-01")).toBe(true);
    expect(isStructuralLink("template/profile")).toBe(true);
    expect(isStructuralLink("slug/research")).toBe(true);
    expect(isStructuralLink("Deep Learning")).toBe(false);
    expect(isStructuralLink("post")).toBe(false);
  });
});

describe("relatedPages", () => {
  it("ranks by number of shared link targets, strongest first", () => {
    const related = relatedPages(
      ["A", "B", "C"],
      [c("Two shared", ["A", "B", "Z"]), c("One shared", ["C", "Y"])],
    );
    expect(related.map((r) => r.title)).toEqual(["Two shared", "One shared"]);
    expect(related[0]?.shared).toBe(2);
    expect(related[1]?.shared).toBe(1);
  });

  it("breaks ties alphabetically by title", () => {
    const related = relatedPages(["X"], [c("Beta", ["X"]), c("Alpha", ["X"])]);
    expect(related.map((r) => r.title)).toEqual(["Alpha", "Beta"]);
  });

  it("ignores structural links so #publish doesn't relate everything", () => {
    const related = relatedPages(
      ["publish", "Topic"],
      [c("Only shares publish", ["publish", "Unrelated"]), c("Shares topic", ["Topic"])],
    );
    expect(related.map((r) => r.title)).toEqual(["Shares topic"]);
  });

  it("excludes given titles (e.g. direct backlinks) and the page itself", () => {
    const related = relatedPages(
      ["A"],
      [c("Self", ["A"]), c("Backlink", ["A"]), c("Other", ["A"])],
      { exclude: ["Self", "Backlink"] },
    );
    expect(related.map((r) => r.title)).toEqual(["Other"]);
  });

  it("honours the limit", () => {
    const candidates = ["P1", "P2", "P3"].map((t) => c(t, ["A"]));
    expect(relatedPages(["A"], candidates, { limit: 2 })).toHaveLength(2);
  });

  it("returns nothing when the page has no meaningful links", () => {
    expect(relatedPages(["publish"], [c("X", ["publish"])])).toEqual([]);
    expect(relatedPages([], [c("X", ["A"])])).toEqual([]);
  });

  it("counts a shared target once even if duplicated in a candidate", () => {
    const related = relatedPages(["A"], [c("Dup", ["A", "A", "A"])]);
    expect(related[0]?.shared).toBe(1);
  });
});
