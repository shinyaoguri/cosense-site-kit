declare module "virtual:cosense-site-kit/site" {
  export interface CosenseSiteInfo {
    title: string;
    description?: string;
    baseUrl: string;
    lang: string;
    base: string;
  }
  const site: CosenseSiteInfo;
  export default site;
}
