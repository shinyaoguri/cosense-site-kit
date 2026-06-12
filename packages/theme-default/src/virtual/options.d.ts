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
    copyright?: string;
    copyrightUrl?: string;
    tokens: Record<string, string>;
    colorScheme?: "light" | "dark";
    fontHref?: string;
    /** Whether the header search box should render (mirrors index generation). */
    search: boolean;
  }
  const options: ThemeDefaultRuntimeOptions;
  export default options;
}
