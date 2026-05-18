declare module "virtual:cosense-theme-portfolio/options" {
  export interface ThemePortfolioNavItem {
    label: string;
    page?: string;
    href?: string;
  }
  export interface ThemePortfolioOptions {
    siteTitle?: string;
    nav: ThemePortfolioNavItem[];
    collection: string;
    homePage?: string;
    blogTag: string;
    blogRoute: string;
  }
  const options: ThemePortfolioOptions;
  export default options;
}
