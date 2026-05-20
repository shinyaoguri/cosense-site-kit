declare module "virtual:cosense-theme-lab/options" {
  export interface ThemeLabNavItem {
    label: string;
    page?: string;
    href?: string;
  }
  export interface ThemeLabOptions {
    siteTitle?: string;
    siteDescription?: string;
    nav: ThemeLabNavItem[];
    homePage?: string;
    researchTag: string;
    newsTag: string;
    affiliation?: string;
    copyrightHolder?: string;
  }
  const options: ThemeLabOptions;
  export default options;
}
