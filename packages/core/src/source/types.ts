// Source abstraction. Today only Cosense is implemented, but the interface
// keeps Cosense-specific knowledge out of the pipeline so a future source
// (e.g. esa, Notion) can plug in without touching consumers.

export interface SourcePageRef {
  id: string;
  title: string;
  updated: number;
  sourceUrl: string;
}

export interface SourcePageRaw {
  id: string;
  title: string;
  updated: number;
  created: number;
  text: string;
  links: string[];
  image: string | null;
  descriptions: string[];
  sourceUrl: string;
  authors?: string[];
}

export interface SiteSource {
  readonly name: string;
  list(opts?: { signal?: AbortSignal }): Promise<SourcePageRef[]>;
  /**
   * Fetch one page's full content. Returns null when the page no longer
   * exists upstream (deleted between list and fetch) — callers skip it.
   * `onWarn` surfaces degraded-mode notes (e.g. a stale-cache fallback)
   * without failing the build.
   */
  fetch(
    ref: SourcePageRef,
    opts?: { signal?: AbortSignal; onWarn?: (message: string) => void },
  ): Promise<SourcePageRaw | null>;
}
