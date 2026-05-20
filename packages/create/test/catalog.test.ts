import { describe, expect, it } from "vitest";
import {
  buildThemeWiring,
  catalog,
  defaultSkin,
  findSkin,
  findTheme,
  resolveSkin,
  resolveTheme,
} from "../src/catalog";

describe("catalog data", () => {
  it("has the default theme with light + dark skins", () => {
    const theme = findTheme("default");
    expect(theme?.package).toBe("@cosense-site-kit/theme-default");
    expect(theme?.skins.map((s) => s.id)).toEqual(["light", "dark"]);
  });

  it("includes the lab theme as a structural (preset-less) theme", () => {
    const lab = findTheme("lab");
    expect(lab?.package).toBe("@cosense-site-kit/theme-lab");
    expect(lab?.integration).toBe("themeLab");
    expect(lab?.skins).toHaveLength(1);
  });

  it("findSkin returns undefined for an unknown skin", () => {
    expect(findSkin(resolveTheme("default"), "neon")).toBeUndefined();
  });

  it("every theme has exactly one default skin and a v1 contract", () => {
    for (const theme of catalog.themes) {
      expect(theme.skins.filter((s) => s.default)).toHaveLength(1);
      expect(theme.schemaVersion).toBe("1");
    }
  });
});

describe("resolveTheme", () => {
  it("defaults to the first theme when no id is given", () => {
    expect(resolveTheme().id).toBe(catalog.themes[0]?.id);
  });

  it("resolves a known id", () => {
    expect(resolveTheme("default").id).toBe("default");
  });

  it("throws on an unknown id, listing the available ones", () => {
    expect(() => resolveTheme("nope")).toThrow(/Unknown theme "nope".*default/);
  });
});

describe("resolveSkin", () => {
  const theme = resolveTheme("default");

  it("falls back to the theme's default skin", () => {
    expect(resolveSkin(theme).id).toBe(defaultSkin(theme).id);
    expect(resolveSkin(theme).id).toBe("light");
  });

  it("resolves a known skin id", () => {
    expect(resolveSkin(theme, "dark").id).toBe("dark");
  });

  it("throws on an unknown skin id", () => {
    expect(() => resolveSkin(theme, "neon")).toThrow(/Unknown skin "neon".*light, dark/);
  });
});

describe("buildThemeWiring", () => {
  const theme = resolveTheme("default");

  it("wires the built-in look with no preset", () => {
    const w = buildThemeWiring(theme, resolveSkin(theme, "light"));
    expect(w.import).toBe('import themeDefault from "@cosense-site-kit/theme-default";');
    expect(w.integration).toBe("themeDefault()");
  });

  it("wires a skin via its named preset export", () => {
    const w = buildThemeWiring(theme, resolveSkin(theme, "dark"));
    expect(w.import).toBe(
      'import themeDefault, { presetDark } from "@cosense-site-kit/theme-default";',
    );
    expect(w.integration).toBe("themeDefault({ preset: presetDark })");
  });

  it("wires a preset-less theme with a bare integration call", () => {
    const lab = resolveTheme("lab");
    const w = buildThemeWiring(lab, resolveSkin(lab));
    expect(w.import).toBe('import themeLab from "@cosense-site-kit/theme-lab";');
    expect(w.integration).toBe("themeLab()");
  });
});
