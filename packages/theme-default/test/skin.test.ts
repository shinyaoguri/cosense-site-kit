import { describe, expect, it } from "vitest";
import type { ThemeDefaultRuntimeOptions } from "../src/index";
import { resolveActiveSkin } from "../src/presets";

const lightOptions: ThemeDefaultRuntimeOptions = { nav: [], tokens: {} };
const darkOptions: ThemeDefaultRuntimeOptions = {
  nav: [],
  tokens: { "--color-bg": "#191919" },
  colorScheme: "dark",
};

describe("resolveActiveSkin", () => {
  it("uses the astro.config preset when .site names no skin", () => {
    const skin = resolveActiveSkin(undefined, darkOptions);
    expect(skin.tokens["--color-bg"]).toBe("#191919");
    expect(skin.colorScheme).toBe("dark");
  });

  it("applies a named skin from .site even with empty astro.config options", () => {
    const skin = resolveActiveSkin("dark", lightOptions);
    expect(skin.colorScheme).toBe("dark");
    expect(skin.tokens["--color-bg"]).toBe("#191919");
  });

  it(".site theme.skin wins over the astro.config preset", () => {
    // astro.config wires dark, but the operator asks for light in .site → light.
    const skin = resolveActiveSkin("light", darkOptions);
    expect(skin.tokens).toEqual({});
    expect(skin.colorScheme).toBe("light");
  });

  it("falls back to the astro.config preset on an unknown skin name", () => {
    const skin = resolveActiveSkin("neon", darkOptions);
    expect(skin.colorScheme).toBe("dark");
  });
});
