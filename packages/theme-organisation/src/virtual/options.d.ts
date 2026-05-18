declare module "virtual:cosense-theme-organisation/options" {
  export interface ThemeOrgNavItem {
    label: string;
    page?: string;
    href?: string;
  }
  export interface ThemeOrgFooterColumn {
    heading: string;
    items: { label: string; page?: string; href?: string }[];
  }
  export interface ThemeOrgOptions {
    siteTitle?: string;
    siteDescription?: string;
    nav: ThemeOrgNavItem[];
    homePage?: string;
    heroHeadline?: string;
    heroSubhead?: string;
    heroCtaLabel?: string;
    heroCtaHref?: string;
    newsTag: string;
    caseTag: string;
    serviceTag: string;
    footer?: ThemeOrgFooterColumn[];
    copyrightHolder?: string;
  }
  const options: ThemeOrgOptions;
  export default options;
}
