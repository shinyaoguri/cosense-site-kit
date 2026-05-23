import { defineConfig } from "astro/config";
import cosense from "@cosense-site-kit/astro";
import themeDefault from "@cosense-site-kit/theme-default";

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    themeDefault({
      // siteTitle is picked up from cosense.config.ts site.title via the
      // virtual:cosense-site-kit/site module exposed by cosense().
      nav: [],
      siteTitle: "cosense-site-kit",
      copyright: "Shinya Oguri",
      copyrightUrl: "https://github.com/shinyaoguri",
      search: true,
      homePage: "Home",
      // preset: presetDark,
    }),
  ],
});
