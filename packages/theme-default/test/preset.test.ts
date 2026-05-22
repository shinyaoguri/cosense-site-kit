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

  it("enables search by default and lets it be turned off explicitly or via preset", () => {
    expect(resolveThemeOptions().search).toBe(true);
    expect(resolveThemeOptions({ search: false }).search).toBe(false);
    // preset's option fills the gap when not passed explicitly
    expect(resolveThemeOptions({ preset: { options: { search: false } } }).search).toBe(false);
    // explicit wins over the preset
    expect(
      resolveThemeOptions({ search: true, preset: { options: { search: false } } }).search,
    ).toBe(true);
  });
});
