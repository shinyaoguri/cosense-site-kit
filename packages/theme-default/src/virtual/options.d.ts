declare module "virtual:cosense-theme-default/options" {
  export interface ThemeDefaultNavItem {
    label: string;
    page?: string;
    href?: string;
  }
  export interface ThemeDefaultRuntimeOptions {
    nav: ThemeDefaultNavItem[];
    homePage?: string;
    siteTitle?: string;
  }
  const options: ThemeDefaultRuntimeOptions;
  export default options;
}
