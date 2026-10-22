import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Baseline security headers, written as dist/_headers so Cloudflare Workers
// Static Assets (which reads that file from the assets directory) serves them.
// GitHub Pages can't set headers; there the file is just an inert static file.
//
// The CSP is deliberately limited to navigation/embedding directives. Fetch
// directives (script-src, style-src, img-src, ...) would break existing sites:
// is:inline / JSON-LD scripts need hashes, Pagefind needs wasm, KaTeX and the
// theme use style attributes (which hashes can't cover alongside
// 'unsafe-inline'), and Cosense content hot-links images from arbitrary hosts.
export const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  // Legacy fallback for browsers that ignore CSP frame-ancestors.
  ["X-Frame-Options", "SAMEORIGIN"],
  [
    "Content-Security-Policy",
    "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  ],
];

/** Render headers as a Workers/Pages `_headers` rule applying to every path. */
export function renderHeadersFile(headers: ReadonlyArray<readonly [string, string]>): string {
  return `/*\n${headers.map(([name, value]) => `  ${name}: ${value}\n`).join("")}`;
}

/**
 * Write the default `_headers` into the build output, unless one is already
 * there — Astro copies `public/_headers` into the output first, and a site that
 * ships its own owns its headers entirely.
 */
export function writeSecurityHeaders(outDir: string): "written" | "kept" {
  const path = join(outDir, "_headers");
  if (existsSync(path)) return "kept";
  writeFileSync(path, renderHeadersFile(SECURITY_HEADERS));
  return "written";
}
