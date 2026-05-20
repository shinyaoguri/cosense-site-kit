import { defineConfig } from "astro/config";
import cosense from "@cosense-site-kit/astro";
__THEME_IMPORT__

export default defineConfig({
  integrations: [
    cosense({ configFile: "./cosense.config.ts" }),
    __THEME_INTEGRATION__,
  ],
});
