import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Subdirectory of the site's public dir that vendored icons are written to. */
export const ICON_DIR_NAME = "cosense-icons";

// Absolute filesystem directory to vendor icons into, derived from Astro's
// configured `publicDir` (a file URL). Honours a custom `publicDir`/`root` and
// running `astro build` from a directory other than the project root, unlike a
// hardcoded `process.cwd()/public`.
export function iconVendorDir(publicDir: URL): string {
  return join(fileURLToPath(publicDir), ICON_DIR_NAME);
}
