// Curated catalog of official themes (and their skins) that the scaffolder can
// wire up. This is the single source of truth for `create-cosense-site --theme`
// / `--skin`: it drives both the interactive picker and the generated
// astro.config.ts + package.json dependency.
//
// Two kinds of variation, per the theme-scaling design:
//   - a theme  = a package that injects its own routes (structural)
//   - a skin   = a preset (CSS-token data) applied to a base theme (cosmetic)
// Skins live under their theme because a preset is theme-specific.
//
// Adding an official entry = editing the data below (+ a test). No new picker
// code. When community themes are opened up later, this is also the shape a
// remote registry would serve.

export interface CatalogSkin {
  /** Stable id used on the CLI (`--skin <id>`). */
  id: string;
  /** Human label shown in the picker. */
  name: string;
  /**
   * Named export from the theme package to pass as `preset`, e.g. "presetDark".
   * Omit for the theme's built-in look (no preset wiring).
   */
  export?: string;
  /** The skin chosen when `--skin` is not given. Exactly one per theme. */
  default?: boolean;
}

export interface CatalogTheme {
  /** Stable id used on the CLI (`--theme <id>`). */
  id: string;
  /** Human label shown in the picker. */
  name: string;
  /** npm package name, written into the scaffold's package.json dependencies. */
  package: string;
  /** Dependency range written into package.json. */
  version: string;
  /** Default-export function name used in astro.config.ts, e.g. "themeDefault". */
  integration: string;
  /** One-line description for the picker. */
  description: string;
  /** Intermediate schema version this theme consumes (compat contract). */
  schemaVersion: "1";
  kind: "theme";
  /** Available skins (always includes one `default`). */
  skins: CatalogSkin[];
}

export interface Catalog {
  themes: CatalogTheme[];
}

export const catalog: Catalog = {
  themes: [
    {
      id: "default",
      name: "Default",
      package: "@cosense-site-kit/theme-default",
      version: "^0.1.0",
      integration: "themeDefault",
      description:
        "Neutral, general-purpose theme: page/profile templates, home, archive, tags, Notion-style hover TOC.",
      schemaVersion: "1",
      kind: "theme",
      skins: [
        { id: "light", name: "Light", default: true },
        { id: "dark", name: "Dark", export: "presetDark" },
      ],
    },
    {
      id: "lab",
      name: "Lab",
      package: "@cosense-site-kit/theme-lab",
      version: "^0.1.0",
      integration: "themeLab",
      description:
        "University research lab: members, research topics, publications, and news from one Cosense project.",
      schemaVersion: "1",
      kind: "theme",
      // No preset system yet; the theme ships a single look.
      skins: [{ id: "default", name: "Default", default: true }],
    },
  ],
};

export function findTheme(id: string): CatalogTheme | undefined {
  return catalog.themes.find((t) => t.id === id);
}

export function findSkin(theme: CatalogTheme, id: string): CatalogSkin | undefined {
  return theme.skins.find((s) => s.id === id);
}

export function defaultSkin(theme: CatalogTheme): CatalogSkin {
  const skin = theme.skins.find((s) => s.default) ?? theme.skins[0];
  if (!skin) throw new Error(`Theme "${theme.id}" has no skins`);
  return skin;
}

/** Resolve a `--theme` id (or the first theme when omitted), throwing on a bad id. */
export function resolveTheme(id?: string): CatalogTheme {
  const theme = id ? findTheme(id) : catalog.themes[0];
  if (!theme) {
    const ids = catalog.themes.map((t) => t.id).join(", ");
    throw new Error(`Unknown theme "${id}". Available: ${ids}`);
  }
  return theme;
}

/** Resolve a `--skin` id within a theme (or its default when omitted), throwing on a bad id. */
export function resolveSkin(theme: CatalogTheme, id?: string): CatalogSkin {
  if (!id) return defaultSkin(theme);
  const skin = findSkin(theme, id);
  if (!skin) {
    const ids = theme.skins.map((s) => s.id).join(", ");
    throw new Error(`Unknown skin "${id}" for theme "${theme.id}". Available: ${ids}`);
  }
  return skin;
}

export interface ThemeWiring {
  /** Import line for astro.config.ts. */
  import: string;
  /** Integration expression for the `integrations: [...]` array. */
  integration: string;
}

// Build the astro.config.ts wiring for a theme + skin selection. A skin with an
// `export` is passed as `preset:`; the built-in look needs no preset.
export function buildThemeWiring(theme: CatalogTheme, skin: CatalogSkin): ThemeWiring {
  if (skin.export) {
    return {
      import: `import ${theme.integration}, { ${skin.export} } from "${theme.package}";`,
      integration: `${theme.integration}({ preset: ${skin.export} })`,
    };
  }
  return {
    import: `import ${theme.integration} from "${theme.package}";`,
    integration: `${theme.integration}()`,
  };
}
