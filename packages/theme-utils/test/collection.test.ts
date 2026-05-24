import { describe, expect, it } from "vitest";
import { parseCollection, renderInlineLinks } from "../src/collection";

const YAML = `
education:
  - period: "2016.04 - 2018.03"
    title: "A University"
    description: "MSc"
publications:
  - year: 2025.12
    authors: "X, Y"
    title: "Paper one"
    source: "Journal A"
    url: "https://example.com/1"
    peerReviewed: true
  - year: 2020.12
    authors: "Y"
    title: "Paper two"
    source: "Journal B"
    peerReviewed: true
    fullPaper: true
  - year: 2019
    authors: "Z"
    title: "Paper three"
    url: ""
awards:
  - year: 2021
    title: "Some Award"
works:
  - year: 2020
    title: "[Online Expo](https://example.com/expo) work"
    description: "(2020.11)"
`;

describe("parseCollection", () => {
  const data = parseCollection(YAML);

  it("keeps sections in YAML key order, headings humanized from the key", () => {
    expect(data?.sections.map((s) => [s.key, s.title])).toEqual([
      ["education", "Education"],
      ["publications", "Publications"],
      ["awards", "Awards"],
      ["works", "Works"],
    ]);
  });

  it("treats period/year as a label (entry) and marks label sections", () => {
    const edu = data?.sections.find((s) => s.key === "education");
    expect(edu?.hasLabels).toBe(true);
    expect(edu?.labelStyle).toBe("period");
    const item = edu?.items[0];
    expect(item?.kind).toBe("entry");
    expect(item?.label).toBe("2016.04 - 2018.03");
  });

  it("treats authors/source items as citations with year as a parenthetical", () => {
    const pubs = data?.sections.find((s) => s.key === "publications");
    expect(pubs?.hasLabels).toBe(false); // citations carry no left label
    const first = pubs?.items[0];
    if (first?.kind !== "citation") throw new Error("expected citation");
    expect(first.authors).toBe("X, Y");
    expect(first.year).toBe("2025.12");
    expect(pubs?.items[2].kind === "citation" && pubs.items[2].url).toBeUndefined(); // empty url dropped
  });

  it("derives tag filters from boolean fields (humanized) and explicit tags", () => {
    const pubs = data?.sections.find((s) => s.key === "publications");
    expect(pubs?.filters).toEqual(["All", "Peer Reviewed", "Full Paper"]);
    expect(pubs?.items[0].tags).toEqual(["Peer Reviewed"]);
    expect(pubs?.items[1].tags).toEqual(["Peer Reviewed", "Full Paper"]);
    expect(pubs?.items[2].tags).toEqual([]);

    const explicit = parseCollection(
      `papers:\n  - title: T\n    tags: ["Selected", "Best Paper"]\n`,
    );
    expect(explicit?.sections[0].filters).toEqual(["All", "Selected", "Best Paper"]);
  });

  it("renders markdown links in entry titles and has no filters when no tags", () => {
    const works = data?.sections.find((s) => s.key === "works");
    expect(works?.filters).toEqual([]);
    const item = works?.items[0];
    expect(item?.kind === "entry" && renderInlineLinks(item.title)).toContain(
      '<a href="https://example.com/expo"',
    );
  });

  it("returns null for missing, empty, or non-mapping YAML", () => {
    expect(parseCollection("")).toBeNull();
    expect(parseCollection("- a\n- b")).toBeNull();
    expect(parseCollection("education: []")).toBeNull();
    expect(parseCollection(":\n  : bad: [")).toBeNull();
  });
});

describe("renderInlineLinks", () => {
  it("converts markdown links and escapes the rest", () => {
    expect(renderInlineLinks("[Expo](https://e.com) & <b>")).toBe(
      '<a href="https://e.com" target="_blank" rel="noopener noreferrer">Expo</a> &amp; &lt;b&gt;',
    );
  });

  it("does not emit anchors for unsafe href schemes", () => {
    expect(renderInlineLinks("a [x](javascript:evil) b")).toBe("a x b");
  });
});
