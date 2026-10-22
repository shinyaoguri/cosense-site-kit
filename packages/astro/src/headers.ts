import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Baseline security headers, written as dist/_headers so Cloudflare Workers
// Static Assets (which reads that file from the assets directory) serves them.
// GitHub Pages can't set headers; there the file is just an inert static file.
//
// script-src allows same-origin files only. Content injected into a static
// site lands in the HTML at build time, so hashing the built HTML's inline
// scripts would allow the injected ones too; instead the build emits no inline
// script at all (the integration turns off Astro's script inlining, and themes
// ship no is:inline code). 'wasm-unsafe-eval' is for Pagefind's search index.
// Other fetch directives stay open: KaTeX and the theme use style attributes,
// and Cosense content hot-links images and embeds from arbitrary hosts.

export type SecurityHeaders = ReadonlyArray<readonly [string, string]>;

/** `false` drops script-src; `scriptSrc` adds allowed sources (analytics, etc.). */
export type CspOption = false | { scriptSrc?: string[] };

const BASE_CSP = [
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
];

// A source is one CSP token: no ";" (next directive), "," (next policy),
// whitespace/newline (another token, or another _headers line) or controls.
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally reject control characters
const UNSAFE_SOURCE = /[;,\s\u0000-\u001F\u007F]/;

export function buildSecurityHeaders(csp?: CspOption): SecurityHeaders {
  const directives = [...BASE_CSP];
  if (csp !== false) {
    const extra = csp?.scriptSrc ?? [];
    for (const source of extra) {
      if (source === "" || UNSAFE_SOURCE.test(source)) {
        throw new Error(
          `Invalid csp.scriptSrc entry ${JSON.stringify(source)}: use one CSP source per entry, e.g. "https://www.googletagmanager.com".`,
        );
      }
    }
    directives.push(["script-src 'self' 'wasm-unsafe-eval'", ...extra].join(" "));
  }
  return [
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    // Legacy fallback for browsers that ignore CSP frame-ancestors.
    ["X-Frame-Options", "SAMEORIGIN"],
    ["Content-Security-Policy", directives.join("; ")],
  ];
}

/**
 * Vite `build.assetsInlineLimit`: never inline scripts (Astro inlines small
 * processed scripts into the HTML, which script-src 'self' would block); other
 * assets keep Vite's default.
 */
export function scriptAssetsInlineLimit(filePath: string): boolean | undefined {
  return filePath.endsWith(".js") ? false : undefined;
}

/** Render headers as a Workers/Pages `_headers` rule applying to every path. */
export function renderHeadersFile(headers: SecurityHeaders): string {
  return `/*\n${headers.map(([name, value]) => `  ${name}: ${value}\n`).join("")}`;
}

/**
 * Write `headers` into the build output as `_headers`, unless one is already
 * there — Astro copies `public/_headers` into the output first, and a site that
 * ships its own owns its headers entirely.
 */
export function writeSecurityHeaders(outDir: string, headers: SecurityHeaders): "written" | "kept" {
  const path = join(outDir, "_headers");
  if (existsSync(path)) return "kept";
  writeFileSync(path, renderHeadersFile(headers));
  return "written";
}
