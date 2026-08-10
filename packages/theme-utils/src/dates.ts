import { hidesDates } from "./tags";

/**
 * Format an ISO timestamp as a `YYYY-MM-DD` (UTC) date string. Returns
 * undefined for undefined input so templates can guard with `&&`. Shared here
 * so themes render dates consistently instead of each re-deriving the slice.
 */
export function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  // Guard like feed.ts's rfc822: an unparseable string would otherwise throw
  // RangeError from toISOString() and crash the build. Return undefined so the
  // template's `&&` guard hides the date.
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** One rendered date: the machine-readable original and its display form. */
export interface PageMetaDate {
  /** Value for `<time datetime>` — the untouched ISO timestamp. */
  iso: string;
  /** Display text (`YYYY-MM-DD`). */
  label: string;
}

export interface PageMetaDates {
  published?: PageMetaDate;
  updated?: PageMetaDate;
}

export interface PageMetaDatesInput {
  /** The page's tag list. `#no-date` suppresses both dates. */
  tags?: string[];
  publishedAt?: string;
  modifiedAt?: string;
  /** Caller-side opt-out (e.g. a list that shows no dates at all). */
  show?: boolean;
}

/**
 * Decide which dates a page's meta row shows. Centralised here — rather than
 * re-derived per theme — because every theme that rebuilt this by hand had to
 * remember two rules, and forked themes reliably dropped the first one:
 *
 *  - `#no-date` opts a page out of showing dates entirely (the dates still exist
 *    in the data for ordering, feed and sitemap; only the display is suppressed).
 *  - the update date is shown only when it differs from the publish date, so a
 *    page edited the day it was published shows a single date.
 *
 * Unparseable timestamps fall back to "no date" via formatDate rather than
 * throwing, so bad source data can't crash a build.
 */
export function pageMetaDates({
  tags = [],
  publishedAt,
  modifiedAt,
  show = true,
}: PageMetaDatesInput): PageMetaDates {
  if (!show || hidesDates(tags)) return {};

  const publishedLabel = formatDate(publishedAt);
  const updatedLabel = formatDate(modifiedAt);
  return {
    ...(publishedAt && publishedLabel
      ? { published: { iso: publishedAt, label: publishedLabel } }
      : {}),
    ...(modifiedAt && updatedLabel && updatedLabel !== publishedLabel
      ? { updated: { iso: modifiedAt, label: updatedLabel } }
      : {}),
  };
}
