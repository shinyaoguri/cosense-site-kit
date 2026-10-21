import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isSafeRedirectSource, normalizeRedirectSource, pathFor } from "@cosense-site-kit/core";

/** Subdirectory of the site's public dir that vendored icons are written to. */
export const ICON_DIR_NAME = "cosense-icons";

// Absolute filesystem directory to vendor icons into, derived from Astro's
// configured `publicDir` (a file URL). Honours a custom `publicDir`/`root` and
// running `astro build` from a directory other than the project root, unlike a
// hardcoded `process.cwd()/public`.
export function iconVendorDir(publicDir: URL): string {
  return join(fileURLToPath(publicDir), ICON_DIR_NAME);
}

// Turn `.site` redirects (already validated by core's schema) into Astro's
// `redirects` map. Sources are re-checked here as defense in depth: Astro
// writes each source to `<outDir>/<source>/index.html`, so a dot segment that
// slipped past the schema (an older intermediate cache, a hand-built
// structure) would write outside the output directory.
//
// Sources are route patterns that Astro prefixes with `base` itself;
// destinations are emitted verbatim into the meta refresh, so the base must be
// baked in or subpath deployments redirect to a 404.
export function buildRedirects(
  redirects: Record<string, string>,
  base: string,
  onSkip?: (source: string) => void,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [from, to] of Object.entries(redirects)) {
    const source = normalizeRedirectSource(from);
    if (!isSafeRedirectSource(source)) {
      onSkip?.(from);
      continue;
    }
    out[pathFor(source)] = pathFor(to, base);
  }
  return out;
}
