// Coerce a requested concurrency to a usable positive integer, defaulting when
// it is undefined, NaN, non-finite, or below 1. Callers step a batch loop by
// this value (`i += concurrency`); a NaN or zero would make the loop never
// advance and silently process nothing, so normalize at the boundary.
export function sanitizeConcurrency(requested: number | undefined, fallback: number): number {
  const n = Math.floor(requested ?? fallback);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}
