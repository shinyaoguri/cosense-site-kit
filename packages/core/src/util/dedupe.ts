/** Return a new array with duplicate values removed, preserving first-seen order. */
export function dedupe<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
