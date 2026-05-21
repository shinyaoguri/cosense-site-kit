import { describe, expect, it } from "vitest";
import { resolveTemplate, templates } from "../src/catalog";

describe("resolveTemplate", () => {
  it("defaults to the first featured template when no spec is given", () => {
    expect(resolveTemplate().repo).toBe(templates[0]?.repo);
  });

  it("resolves a featured id to its repo", () => {
    expect(resolveTemplate("lab").repo).toBe("shinyaoguri/cosense-site-lab");
  });

  it("passes a user/repo spec through unchanged", () => {
    const r = resolveTemplate("someone/their-template");
    expect(r.repo).toBe("someone/their-template");
    expect(r.name).toBe("someone/their-template");
  });

  it("throws on an unknown bare id, listing the featured ones", () => {
    expect(() => resolveTemplate("nope")).toThrow(/Unknown template "nope".*default, lab/);
  });
});
