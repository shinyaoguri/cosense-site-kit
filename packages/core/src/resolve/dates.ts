import type { CosenseSitePage } from "../schema/v1/page";

const PUBLISHED_TAG_PREFIX = "published/";
const UPDATED_TAG_PREFIX = "updated/";

export interface DateAssignment {
  pages: CosenseSitePage[];
  /** One message per page whose date tag was present but unparseable. */
  warnings: string[];
}

// Resolve the dates a page presents. Users may override the Cosense timestamps
// with `#published/YYYY-MM-DD` (publish date) and `#updated/YYYY-MM-DD` (updated
// date) tags. An absent or unparseable tag falls back to the Cosense value, so
// the raw createdAt/updatedAt are always preserved alongside the resolved
// publishedAt/modifiedAt.
export function assignDates(pages: CosenseSitePage[]): DateAssignment {
  const warnings: string[] = [];
  const resolved = pages.map((page) => {
    const published = resolveTagDate(page, PUBLISHED_TAG_PREFIX, warnings);
    const updated = resolveTagDate(page, UPDATED_TAG_PREFIX, warnings);
    return {
      ...page,
      publishedAt: published ?? page.createdAt,
      modifiedAt: updated ?? page.updatedAt,
    };
  });
  return { pages: resolved, warnings };
}

function resolveTagDate(
  page: CosenseSitePage,
  prefix: string,
  warnings: string[],
): string | undefined {
  const tag = page.tags.find((t) => t.startsWith(prefix));
  if (!tag) return undefined;
  const iso = parseUserDate(tag.slice(prefix.length));
  if (!iso) {
    warnings.push(
      `"${page.title}": ignoring invalid #${tag} (expected #${prefix}YYYY-MM-DD); using Cosense date`,
    );
    return undefined;
  }
  return iso;
}

// Strict YYYY-MM-DD parse → ISO timestamp at UTC midnight, or undefined.
// Rejects malformed strings and impossible dates (e.g. 2026-02-30) that the
// Date constructor would otherwise silently roll over to the next month.
export function parseUserDate(value: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date.toISOString();
}
