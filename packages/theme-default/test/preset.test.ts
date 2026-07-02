import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

// ── WCAG AA contrast regression ──────────────────────────────────────────────
// Text tokens carry real content (dates, summaries, the 404 code), so every
// text token must clear WCAG 2.x AA (4.5:1) against the surfaces text sits on
// — the base and card backgrounds — in both the light default and presetDark.
// --color-text-faint is decorative only (underlines/bars) and intentionally
// excluded. This locks the fix and auto-checks any future skin.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const m = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// Parse the hex custom properties from global.css `:root` so the test tracks the
// real defaults instead of a hand-copied snapshot that could drift.
function lightTokens(): Record<string, string> {
  const cssPath = join(dirname(fileURLToPath(import.meta.url)), "../src/styles/global.css");
  const css = readFileSync(cssPath, "utf8");
  const block = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
  const tokens: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) tokens[m[1]] = m[2];
  return tokens;
}

const TEXT_TOKENS = ["--color-text", "--color-text-soft", "--color-text-muted"];
const BACKGROUNDS = ["--color-bg", "--color-bg-soft"];

describe("WCAG AA text contrast", () => {
  const light = lightTokens();
  const schemes = {
    light,
    dark: { ...light, ...(presetDark.tokens ?? {}) },
  };

  for (const [scheme, tokens] of Object.entries(schemes)) {
    for (const text of TEXT_TOKENS) {
      for (const bg of BACKGROUNDS) {
        it(`${scheme}: ${text} on ${bg} clears 4.5:1`, () => {
          const fg = tokens[text];
          const surface = tokens[bg];
          expect(fg, `${text} missing`).toBeDefined();
          expect(surface, `${bg} missing`).toBeDefined();
          expect(contrastRatio(fg, surface)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
