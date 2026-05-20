import { describe, expect, it } from "vitest";
import { presetDark, resolveThemeOptions, type ThemeDefaultPreset } from "../src/index";

describe("resolveThemeOptions", () => {
  it("defaults to empty nav and no tokens when no preset is given", () => {
    const o = resolveThemeOptions();
    expect(o.nav).toEqual([]);
    expect(o.tokens).toEqual({});
    expect(o.colorScheme).toBeUndefined();
    expect(o.fontHref).toBeUndefined();
  });

  it("applies a preset's tokens and colorScheme", () => {
    const o = resolveThemeOptions({ preset: presetDark });
    expect(o.colorScheme).toBe("dark");
    expect(o.tokens["--color-bg"]).toBe("#191919");
    // dark preset keeps the built-in fonts
    expect(o.fontHref).toBeUndefined();
  });

  it("lets explicit options win over the preset's options", () => {
    const preset: ThemeDefaultPreset = {
      name: "branded",
      options: { siteTitle: "FromPreset", copyright: "Preset Co" },
    };
    const o = resolveThemeOptions({ preset, siteTitle: "Explicit" });
    expect(o.siteTitle).toBe("Explicit");
    // copyright not passed explicitly → falls back to the preset's value
    expect(o.copyright).toBe("Preset Co");
  });

  it("carries fontHref through from the preset", () => {
    const o = resolveThemeOptions({ preset: { fontHref: "https://fonts.example/x.css" } });
    expect(o.fontHref).toBe("https://fonts.example/x.css");
  });
});
