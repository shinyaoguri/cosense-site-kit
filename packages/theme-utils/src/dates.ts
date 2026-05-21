/**
 * Format an ISO timestamp as a `YYYY-MM-DD` (UTC) date string. Returns
 * undefined for undefined input so templates can guard with `&&`. Shared here
 * so themes render dates consistently instead of each re-deriving the slice.
 */
export function formatDate(iso: string | undefined): string | undefined {
  return iso ? new Date(iso).toISOString().slice(0, 10) : undefined;
}
