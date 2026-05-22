import { defineConfig } from "vitest/config";

// Two projects: fast pure-unit tests run in a plain node environment, while the
// theme-utils rendering tests need Astro's Vite setup (its own config) to
// import and render .astro components. Splitting them keeps the unit tests from
// pulling Astro into their transform pipeline.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/test/**/*.test.ts", "packages/*/src/**/*.test.ts"],
          environment: "node",
        },
      },
      "packages/theme-utils/vitest.config.ts",
    ],
  },
});
