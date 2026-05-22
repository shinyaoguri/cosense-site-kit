import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Slugs are derived from page titles, so renaming a Cosense page changes its
// URL and breaks every external link/bookmark to the old one. Cosense page ids
// are stable, though, so we remember each id's last-known slug and, when it
// changes, emit a redirect from the old slug to the new one. The store lives in
// the cache dir (persisted across CI runs like the page cache), so renames are
// caught build-over-build without the operator hand-writing redirects.

export interface RedirectStore {
  /** Stable Cosense page id → its current slug (last build). */
  slugs: Record<string, string>;
  /** Accumulated auto-redirects: old slug → current destination slug. */
  redirects: Record<string, string>;
}

export function emptyRedirectStore(): RedirectStore {
  return { slugs: {}, redirects: {} };
}

// Diff the previous slug snapshot against the current pages and return the
// updated store. Pure (no IO) so the redirect logic is unit-tested directly.
//
// - A page whose slug changed contributes oldSlug → newSlug.
// - Existing redirects pointing at a now-old slug are rewritten to the final
//   destination, so a page renamed twice still resolves in a single hop.
// - Redirects are dropped when their source is a live page again (a new page
//   took the slug) or their destination no longer exists (page deleted), and
//   self-redirects are never kept.
export function computeRenameRedirects(
  prev: RedirectStore,
  pages: { id: string; slug: string }[],
): RedirectStore {
  const slugs: Record<string, string> = {};
  const redirects: Record<string, string> = { ...prev.redirects };

  for (const page of pages) {
    slugs[page.id] = page.slug;
    const before = prev.slugs[page.id];
    if (before && before !== page.slug) {
      redirects[before] = page.slug;
      for (const [from, to] of Object.entries(redirects)) {
        if (to === before) redirects[from] = page.slug;
      }
    }
  }

  const liveSlugs = new Set(pages.map((p) => p.slug));
  for (const [from, to] of Object.entries(redirects)) {
    if (from === to || liveSlugs.has(from) || !liveSlugs.has(to)) {
      delete redirects[from];
    }
  }

  return { slugs, redirects };
}

const STORE_FILE = "redirects.json";

export async function loadRedirectStore(cacheDir: string): Promise<RedirectStore> {
  try {
    const buf = await readFile(join(cacheDir, STORE_FILE), "utf8");
    const parsed = JSON.parse(buf) as Partial<RedirectStore>;
    return {
      slugs: parsed.slugs ?? {},
      redirects: parsed.redirects ?? {},
    };
  } catch {
    // Missing or unreadable store → start fresh (first build, or cache miss).
    return emptyRedirectStore();
  }
}

export async function saveRedirectStore(cacheDir: string, store: RedirectStore): Promise<void> {
  const file = join(cacheDir, STORE_FILE);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(store, null, 2)}\n`);
}
