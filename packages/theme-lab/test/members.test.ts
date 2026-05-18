import { describe, expect, it } from "vitest";
import type { CosenseBlock } from "@cosense-site-kit/core";
import { asGroups, extractMembers, initialsOf } from "../src/lib/members";

function codeBlock(filename: string, value: string): CosenseBlock {
  return { type: "code", filename, value };
}

describe("extractMembers", () => {
  it("returns null when no members.yaml block is present", () => {
    expect(
      extractMembers([
        { type: "paragraph", children: [{ type: "text", value: "hi" }] },
      ]),
    ).toBeNull();
  });

  it("parses a flat members list", () => {
    const yaml = `
members:
  - name: "Shinya Oguri"
    role: "Lecturer"
  - name: "Hanako Sato"
    role: "M1"
`;
    const data = extractMembers([codeBlock("members.yaml", yaml)]);
    expect(data?.members?.length).toBe(2);
    expect(data?.members?.[1]?.name).toBe("Hanako Sato");
  });

  it("parses grouped members with photos and links", () => {
    const yaml = `
groups:
  - name: "Faculty"
    members:
      - name: "Shinya Oguri"
        role: "Lecturer"
        photo: "https://example.com/p.jpg"
        bio: "Researcher in digital culture"
        links:
          - { label: "Web", url: "https://example.com" }
          - { label: "GitHub", url: "https://github.com/x" }
  - name: "Students"
    members:
      - name: "Hanako Sato"
        role: "M1"
`;
    const data = extractMembers([codeBlock("members.yaml", yaml)]);
    expect(data?.groups?.length).toBe(2);
    const oguri = data?.groups?.[0]?.members[0];
    expect(oguri?.photo).toContain("p.jpg");
    expect(oguri?.links?.length).toBe(2);
  });

  it("returns null on malformed YAML", () => {
    const data = extractMembers([codeBlock("members.yaml", "members: [\n  - broken")]);
    expect(data).toBeNull();
  });

  it("rejects YAML with neither members nor groups", () => {
    expect(extractMembers([codeBlock("members.yaml", "other: 1")])).toBeNull();
  });
});

describe("asGroups", () => {
  it("returns existing groups as-is", () => {
    const groups = asGroups({ groups: [{ name: "G1", members: [{ name: "A" }] }] });
    expect(groups).toEqual([{ name: "G1", members: [{ name: "A" }] }]);
  });

  it("wraps a flat list into a single unnamed group", () => {
    const groups = asGroups({ members: [{ name: "A" }, { name: "B" }] });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("");
    expect(groups[0]?.members).toHaveLength(2);
  });

  it("returns an empty array when both are empty", () => {
    expect(asGroups({})).toEqual([]);
  });
});

describe("initialsOf", () => {
  it("takes the first two non-space chars", () => {
    expect(initialsOf("Shinya Oguri")).toBe("Sh");
    expect(initialsOf("小栗 真弥")).toBe("小栗");
  });
  it("handles short names", () => {
    expect(initialsOf("S")).toBe("S");
    expect(initialsOf("")).toBe("");
  });
});
