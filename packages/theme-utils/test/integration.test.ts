import { describe, expect, it } from "vitest";
import { optionsVirtualModule } from "../src/integration";

describe("optionsVirtualModule", () => {
  const plugin = optionsVirtualModule("virtual:my-theme/options", { siteTitle: "X", n: 1 });

  it("resolves only its own virtual id (to the \\0-prefixed form)", () => {
    expect(plugin.resolveId("virtual:my-theme/options")).toBe("\0virtual:my-theme/options");
    expect(plugin.resolveId("virtual:other/options")).toBeNull();
  });

  it("serves the options object as a JSON default export", () => {
    expect(plugin.load("\0virtual:my-theme/options")).toBe(
      'export default {"siteTitle":"X","n":1};',
    );
    expect(plugin.load("virtual:my-theme/options")).toBeNull();
    expect(plugin.load("\0virtual:other/options")).toBeNull();
  });
});
