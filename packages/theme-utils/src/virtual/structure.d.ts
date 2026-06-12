// In-repo typecheck shim. The cosense() Astro integration provides this
// virtual module at build time via a Vite plugin.

declare module "virtual:cosense-site-kit/structure" {
  import type { SiteStructure } from "@cosense-site-kit/core";

  const structure: SiteStructure;
  export default structure;
}
