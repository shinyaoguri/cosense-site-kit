import { describe, expect, it } from "vitest";
import {
  buildThemeWiring,
  catalog,
  defaultSkin,
  findSkin,
  findTheme,
  resolveSkin,
  resolveTheme,
  type ThemePackageMeta,
  themeFromMetadata,
} from "../src/catalog";

describe("catalog data", () => {
  it("has the default theme with light + dark skins", () => {
    const theme = findTheme("default");
    expect(theme?.package).toBe("@cosense-site-kit/theme-default");
    expect(theme?.skins.map((s) => s.id)).toEqual(["light", "dark"]);
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

});

describe("themeFromMetadata (third-party themes)", () => {
  const meta: ThemePackageMeta = {
    kind: "theme",
    schemaVersion: "1",
    name: "Foo",
    skins: [
      { id: "light", default: true },
      { id: "dark", export: "presetDark" },
    ],
  };

  it("synthesizes a theme bound to the package's default export", () => {
    const t = themeFromMetadata("@someone/cosense-theme-foo", "1.2.3", meta);
    expect(t.package).toBe("@someone/cosense-theme-foo");
    expect(t.version).toBe("^1.2.3"); // bare version gets a caret range
    expect(t.integration).toBe("theme"); // generic local alias for any package
    expect(t.name).toBe("Foo");
    // wiring uses the generic alias + the declared preset export
    const w = buildThemeWiring(t, resolveSkin(t, "dark"));
    expect(w.import).toBe('import theme, { presetDark } from "@someone/cosense-theme-foo";');
    expect(w.integration).toBe("theme({ preset: presetDark })");
  });

  it("defaults to a single light skin when metadata declares none", () => {
    const t = themeFromMetadata("x", "^2.0.0", { kind: "theme", schemaVersion: "1" });
    expect(t.version).toBe("^2.0.0"); // existing range kept as-is
    expect(t.skins).toHaveLength(1);
    expect(defaultSkin(t).id).toBe("light");
  });

  it("forces a default skin when none is marked", () => {
    const t = themeFromMetadata("y", "0.1.0", {
      kind: "theme",
      schemaVersion: "1",
      skins: [{ id: "a" }, { id: "b" }],
    });
    expect(defaultSkin(t).id).toBe("a");
  });

  it("wires the built-in (no-export) skin with a bare call", () => {
    const t = themeFromMetadata("@x/y", "1.0.0", { kind: "theme", schemaVersion: "1" });
    const w = buildThemeWiring(t, resolveSkin(t));
    expect(w.import).toBe('import theme from "@x/y";');
    expect(w.integration).toBe("theme()");
  });
});
