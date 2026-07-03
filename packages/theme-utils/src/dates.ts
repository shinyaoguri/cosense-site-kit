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
