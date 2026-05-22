import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

// Full-text search via Pagefind. We build the index from the static HTML at
// `astro:build:done` (Pagefind's Node API) and write it to dist/pagefind/, and
// in dev we serve a previously built bundle so the search box works after at
// least one build. This is inlined rather than using the astro-pagefind
// package because that package ships raw .ts under node_modules, which Astro's
// config loader can't type-strip (Node refuses to strip types in node_modules).

const MIME: Record<string, string> = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
};

export function pagefindIntegration(): AstroIntegration {
  let outDir: string | undefined;
  // Base path with a guaranteed trailing slash ("/" or "/repo/"), used to match
  // dev requests that Astro serves under the configured base.
  let base = "/";

  return {
    name: "cosense-theme-default/pagefind",
    hooks: {
      "astro:config:setup": ({ config }) => {
        outDir = fileURLToPath(config.outDir);
        base = config.base.endsWith("/") ? config.base : `${config.base}/`;
      },

      // Dev convenience: serve <outDir>/pagefind/* (from a prior build) so the
      // search box returns results in `astro dev` without wiring a separate
      // server. No build has its own index, so this is stale until you rebuild.
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (!req.url || !outDir) return next();
          const url = req.url.split("?")[0] ?? "";
          const prefix = `${base}pagefind/`;
          if (!url.startsWith(prefix)) return next();
          const file = path.join(outDir, decodeURIComponent(url.slice(base.length)));
          // Contain path traversal to the output directory.
          if (!file.startsWith(outDir) || !existsSync(file) || !statSync(file).isFile()) {
            return next();
          }
          res.setHeader("content-type", MIME[path.extname(file)] ?? "application/octet-stream");
          createReadStream(file).pipe(res);
        });
      },

      "astro:build:done": async ({ dir, logger }) => {
        const target = fileURLToPath(dir);
        const { createIndex } = await import("pagefind");
        const { index, errors } = await createIndex();
        if (!index) {
          logger.error(
            `Pagefind: failed to create index${errors.length ? `: ${errors.join(", ")}` : ""}`,
          );
          return;
        }
        const added = await index.addDirectory({ path: target });
        if (added.errors.length) {
          logger.error(`Pagefind: failed to index files: ${added.errors.join(", ")}`);
          return;
        }
        const written = await index.writeFiles({ outputPath: path.join(target, "pagefind") });
        if (written.errors.length) {
          logger.error(`Pagefind: failed to write index: ${written.errors.join(", ")}`);
          return;
        }
        logger.info(`Pagefind: indexed ${added.page_count} page(s) → /pagefind/`);
      },
    },
  };
}
