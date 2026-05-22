import { describe, expect, it } from "vitest";
import { buildListTree, type FlatListItem } from "../src/lists";

const t = (value: string): FlatListItem["children"] => [{ type: "text", value }];

describe("buildListTree", () => {
  it("keeps same-depth items as siblings", () => {
    const tree = buildListTree([
      { depth: 1, children: t("a") },
      { depth: 1, children: t("b") },
    ]);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.items).toHaveLength(0);
  });

  it("nests deeper items under the preceding shallower item", () => {
    const tree = buildListTree([
      { depth: 1, children: t("a") },
      { depth: 2, children: t("a.1") },
      { depth: 2, children: t("a.2") },
      { depth: 1, children: t("b") },
    ]);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.items).toHaveLength(2);
    expect(tree[1]?.items).toHaveLength(0);
  });

  it("carries the ordered flag through", () => {
    const tree = buildListTree([
      { depth: 1, ordered: true, children: t("1") },
      { depth: 1, ordered: true, children: t("2") },
    ]);
    expect(tree.every((n) => n.ordered)).toBe(true);
  });

  it("returns deeper-then-shallower back to the root level", () => {
    const tree = buildListTree([
      { depth: 1, children: t("a") },
      { depth: 3, children: t("deep") },
      { depth: 1, children: t("b") },
    ]);
    // a has the deep child; b is a sibling of a at the root.
    expect(tree).toHaveLength(2);
    expect(tree[0]?.items).toHaveLength(1);
  });
});
