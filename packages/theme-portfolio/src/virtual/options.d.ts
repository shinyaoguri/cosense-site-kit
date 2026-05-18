declare module "virtual:cosense-theme-portfolio/options" {
  export interface ThemePortfolioNavItem {
    label: string;
    page?: string;
    href?: string;
  }
  export interface ThemePortfolioOptions {
    siteTitle?: string;
    siteTagline?: string;
    siteDescription?: string;
    nav: ThemePortfolioNavItem[];
    homePage?: string;
    blogTag: string;
    blogRoute: string;
    copyrightHolder?: string;
  }
  const options: ThemePortfolioOptions;
  export default options;
}
