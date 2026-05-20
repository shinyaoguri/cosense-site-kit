import type { CosenseBlock } from "@cosense-site-kit/core";
import { describe, expect, it } from "vitest";
import { extractPublications, sortPublicationsDesc } from "../src/lib/publications";

function codeBlock(filename: string, value: string): CosenseBlock {
  return { type: "code", filename, value };
}

describe("extractPublications", () => {
  it("returns null when no publications.yaml block is present", () => {
    expect(extractPublications([])).toBeNull();
  });

  it("parses publications with peerReviewed/fullPaper flags", () => {
    const yaml = `
publications:
  - year: 2024
    authors: "OGURI"
    title: "Foo"
    source: "Bar"
    peerReviewed: true
    fullPaper: true
  - year: 2023
    authors: "OGURI et al."
    title: "Baz"
    source: "Qux"
`;
    const data = extractPublications([codeBlock("publications.yaml", yaml)]);
    expect(data?.publications.length).toBe(2);
    expect(data?.publications[0]?.peerReviewed).toBe(true);
    expect(data?.publications[1]?.peerReviewed).toBeUndefined();
  });

  it("accepts string-valued year (e.g. 2024.06)", () => {
    const yaml = `
publications:
  - year: "2024.06"
    authors: "A"
    title: "T"
    source: "S"
`;
    const data = extractPublications([codeBlock("publications.yaml", yaml)]);
    expect(data?.publications[0]?.year).toBe("2024.06");
  });

  it("returns null on malformed YAML", () => {
    const data = extractPublications([codeBlock("publications.yaml", "publications: [")]);
    expect(data).toBeNull();
  });
});

describe("sortPublicationsDesc", () => {
  it("orders newest-first by year (numeric)", () => {
    const result = sortPublicationsDesc([
      { year: 2020, authors: "a", title: "x", source: "s" },
      { year: 2024, authors: "b", title: "y", source: "s" },
      { year: 2022, authors: "c", title: "z", source: "s" },
    ]);
    expect(result.map((p) => p.year)).toEqual([2024, 2022, 2020]);
  });

  it("orders correctly when year is mixed string/number (lexicographic)", () => {
    const result = sortPublicationsDesc([
      { year: "2024.06", authors: "a", title: "x", source: "s" },
      { year: "2024.12", authors: "b", title: "y", source: "s" },
      { year: "2023.01", authors: "c", title: "z", source: "s" },
    ]);
    expect(result.map((p) => p.year)).toEqual(["2024.12", "2024.06", "2023.01"]);
  });
});
