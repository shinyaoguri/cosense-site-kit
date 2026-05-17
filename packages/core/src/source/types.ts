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
  fetch(ref: SourcePageRef, opts?: { signal?: AbortSignal }): Promise<SourcePageRaw>;
}
