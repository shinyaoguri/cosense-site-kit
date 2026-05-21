// Helpers for a theme's Astro integration (the plumbing, not the rendering).
// Shared so every theme — theme-default and third-party alike — sits on the
// same base instead of copy-pasting the boilerplate.

export interface OptionsVirtualModulePlugin {
  name: string;
  resolveId(id: string): string | null;
  load(id: string): string | null;
}

// Build a Vite plugin that exposes a theme's options object as a virtual
// module, so templates can `import options from "virtual:my-theme/options"`.
// Use in the theme's integration's astro:config:setup:
//   updateConfig({ vite: { plugins: [optionsVirtualModule(id, options)] } });
// `options` must be JSON-serializable (no functions/components).
export function optionsVirtualModule(id: string, options: unknown): OptionsVirtualModulePlugin {
  const resolved = `\0${id}`;
  return {
    name: `cosense-theme-options:${id}`,
    resolveId(requested) {
      return requested === id ? resolved : null;
    },
    load(requested) {
      return requested === resolved ? `export default ${JSON.stringify(options)};` : null;
    },
  };
}
