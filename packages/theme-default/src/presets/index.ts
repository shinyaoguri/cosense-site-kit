import type { ThemeDefaultPreset, ThemeDefaultRuntimeOptions } from "../index";
import { presetDark } from "./dark";

// Named skins selectable from `.site` YAML `theme.skin` (operator-controlled,
// editable in Cosense — no repo edit). "light" is the built-in look (no token
// overrides); selecting it explicitly overrides a preset wired in astro.config.
// Add a skin here and it becomes selectable from Cosense.
export const PRESETS: Record<string, ThemeDefaultPreset> = {
  light: { name: "light", colorScheme: "light", tokens: {} },
  dark: presetDark,
};

export interface ActiveSkin {
  tokens: Record<string, string>;
  colorScheme?: "light" | "dark";
  fontHref?: string;
}

// Resolve the skin to apply. `.site theme.skin` wins (so operators switch the
// look from Cosense, browser-only); otherwise the preset wired in astro.config.ts
// via `options`; otherwise the built-in light look. An unknown name warns and
// falls back to the astro.config preset.
export function resolveActiveSkin(
  siteSkinName: string | undefined,
  options: ThemeDefaultRuntimeOptions,
): ActiveSkin {
  if (siteSkinName) {
    const named = PRESETS[siteSkinName];
    if (named) {
      return {
        tokens: named.tokens ?? {},
        colorScheme: named.colorScheme,
        fontHref: named.fontHref,
      };
    }
    console.warn(
      `[theme-default] unknown skin "${siteSkinName}" in .site theme.skin; using the astro.config preset / light`,
    );
  }
  return {
    tokens: options.tokens ?? {},
    colorScheme: options.colorScheme,
    fontHref: options.fontHref,
  };
}
