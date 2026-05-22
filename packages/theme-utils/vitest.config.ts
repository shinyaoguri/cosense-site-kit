import { getViteConfig } from "astro/config";

// The cosense() integration injects virtual:cosense-site-kit/structure at build
// time; structure.ts imports it at module load. Stub it here so the rendering
// components import cleanly under the Container API (the smoke test passes
// blocks directly and doesn't exercise structure data).
const STRUCTURE_ID = "virtual:cosense-site-kit/structure";
const RESOLVED = `\0${STRUCTURE_ID}`;
const stubCosenseVirtuals = {
  name: "stub-cosense-virtuals",
  resolveId(id: string) {
    return id === STRUCTURE_ID ? RESOLVED : null;
  },
  load(id: string) {
    return id === RESOLVED ? "export default { nav: [], redirects: {} };" : null;
  },
};

// Rendering tests import real .astro components and render them with Astro's
// Container API, so they need Astro's Vite setup. Kept as its own vitest
// project (see the root vitest.config.ts `projects`) so the fast pure-unit
// tests don't pull Astro into their transform pipeline.
export default getViteConfig({
  plugins: [stubCosenseVirtuals],
  test: {
    name: "theme-utils-render",
    include: ["test-render/**/*.test.ts"],
    environment: "node",
  },
});
