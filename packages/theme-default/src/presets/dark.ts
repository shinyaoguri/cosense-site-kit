import type { ThemeDefaultPreset } from "../index";

// Dark skin for theme-default. Pure token overrides — no extra .astro — keeping
// the Notion-warm character on a dark canvas. Keeps the built-in M PLUS fonts
// (no fontHref). Usage:
//
//   import themeDefault, { presetDark } from "@cosense-site-kit/theme-default";
//   themeDefault({ preset: presetDark })
//
// Every key here overrides a token declared in styles/global.css `:root`.
export const presetDark: ThemeDefaultPreset = {
  name: "dark",
  colorScheme: "dark",
  tokens: {
    "--color-bg": "#191919",
    "--color-bg-soft": "#202020",
    "--color-bg-hover": "#2c2c2b",
    "--color-text": "#e6e6e3",
    "--color-text-soft": "#a8a8a3",
    "--color-text-muted": "#7d7c78",
    "--color-text-faint": "#4d4d4a",
    "--color-border": "#333331",
    "--color-border-soft": "#262625",
    "--color-divider": "rgb(255 255 255 / 0.094)",
    "--color-accent": "#529cca",
    "--color-accent-hover": "#6cb0db",
    "--color-accent-soft": "rgb(82 156 202 / 0.16)",
    "--color-code-bg": "rgb(255 255 255 / 0.08)",
    "--color-code-text": "#ff7369",
    "--color-callout-bg": "#202020",
    "--color-callout-border": "#333331",
    "--color-tag-bg": "rgb(255 255 255 / 0.08)",
    "--color-tag-text": "#a8a8a3",
    "--color-header-bg": "rgb(25 25 25 / 0.8)",
  },
};
