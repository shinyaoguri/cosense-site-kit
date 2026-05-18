import { defineConfig } from "astro/config";
import cosense from "@cosense-site-kit/astro";
import themeDefault from "@cosense-site-kit/theme-default";

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    themeDefault({
      siteTitle: "cosense-site-kit",
      nav: [],
    }),
  ],
});
