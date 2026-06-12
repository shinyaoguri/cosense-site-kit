import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/integration.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  external: ["astro", "astro:content", "virtual:cosense-site-kit/structure", "katex"],
});
