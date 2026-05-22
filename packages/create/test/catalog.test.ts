import { describe, expect, it } from "vitest";
import { resolveTheme, themes } from "../src/catalog";

describe("resolveTheme", () => {
  it("defaults to the first featured theme when no spec is given", () => {
    expect(resolveTheme().repo).toBe(themes[0]?.repo);
  });

  it("resolves a featured id to its repo", () => {
    expect(resolveTheme("lab").repo).toBe("shinyaoguri/cosense-theme-lab");
  });

  it("passes a user/repo spec through unchanged", () => {
    const r = resolveTheme("someone/their-theme");
    expect(r.repo).toBe("someone/their-theme");
    expect(r.name).toBe("someone/their-theme");
  });

  it("throws on an unknown bare id, listing the featured ones", () => {
    expect(() => resolveTheme("nope")).toThrow(/Unknown theme "nope".*default, lab/);
  });
});
