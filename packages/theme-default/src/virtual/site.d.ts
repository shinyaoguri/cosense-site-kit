// Type shim for the virtual module exposed by @cosense-site-kit/astro's
// cosense() integration. The actual implementation lives in the integration's
// Vite plugin; this declaration just lets theme-default typecheck and
// type-import the shape.

declare module "virtual:cosense-site-kit/site" {
  export interface CosenseSiteInfo {
    title: string;
    description?: string;
    baseUrl: string;
    lang: string;
    base: string;
    /** Favicon URL (the first/home page's icon), vendored locally. */
    icon?: string;
  }
  const site: CosenseSiteInfo;
  export default site;
}
