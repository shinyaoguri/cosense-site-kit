import { parse as parseYaml } from "yaml";

// Allow only schemes that can't execute script (http/https/mailto/relative/
// fragment); anything else (javascript:, data:, …) is dropped. Defense in
// depth — Cosense authors are trusted, but a citation `url:` flows straight
// into an <a href>, so sanitize it the same way inline markdown links are.
const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;

/** Return `href` when it uses a safe scheme, otherwise `undefined`. */
export function safeHref(href: string | undefined): string | undefined {
  return href && SAFE_HREF.test(href) ? href : undefined;
}

// A data-driven "collection" page: the `collection` theme template reads the
// first YAML code block off a Cosense page and renders it as a set of list
// sections (see `parseCollection`). Nothing here is domain-specific — section
// keys, ordering, headings, item fields and the per-section tag filters all
// come from the YAML, so the same template serves a CV, a publication list, a
// works/portfolio index, a link list, and so on.
//
// The YAML is a mapping of `sectionKey: [item, …]`. Each item is rendered from
// whichever recognized fields it has:
//
//   label | period | term | date   left-column label
//   year                            label fallback (entry) / "(year)" (citation)
//   authors                         prefix text (marks the item a citation)
//   title                           main text (required); linked via `url`
//   source                          suffix text (marks the item a citation)
//   description | note              trailing detail (entry)
//   url                             link target for a citation title
//   tags: [..]                      filter chips + badges
//   <anyBoolean>: true              also added as a tag (humanized field name)

/** A plain timeline/list entry: a label + title (+ trailing detail). */
export interface CollectionEntryItem {
  kind: "entry";
  label?: string;
  /** May contain inline markdown links `[text](url)`. */
  title: string;
  /** May contain inline markdown links. */
  description?: string;
  tags: string[];
}

/** A bibliographic entry: authors + "title" + source (year). */
export interface CollectionCitationItem {
  kind: "citation";
  label?: string;
  authors?: string;
  title: string;
  source?: string;
  year?: string;
  url?: string;
  tags: string[];
}

export type CollectionItem = CollectionEntryItem | CollectionCitationItem;

export interface CollectionSection {
  key: string;
  title: string;
  /** True when any item has a left label → render as a label-column timeline. */
  hasLabels: boolean;
  /** Label column width hint: period ranges are wider than single years. */
  labelStyle: "period" | "year";
  items: CollectionItem[];
  /** Filter chips: `["All", ...union of item tags]`, or [] when no tags. */
  filters: string[];
}

export interface CollectionData {
  sections: CollectionSection[];
}

export interface ParseCollectionOptions {
  /** key → heading overrides, merged over the humanized key. */
  titles?: Record<string, string>;
  /** Explicit section order. Default: the order keys appear in the YAML. */
  order?: string[];
}

/** Coerce scalar YAML values to a display string; drop everything else. */
function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

/** Title-case a key/field name for use as a heading or tag label. */
function humanize(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Tags = explicit `tags:` strings, then any boolean-true field (humanized). */
function collectTags(o: Record<string, unknown>): string[] {
  const tags: string[] = [];
  if (Array.isArray(o.tags)) {
    for (const t of o.tags) {
      const s = str(t);
      if (s && !tags.includes(s)) tags.push(s);
    }
  }
  for (const [k, v] of Object.entries(o)) {
    if (v === true) {
      const label = humanize(k);
      if (!tags.includes(label)) tags.push(label);
    }
  }
  return tags;
}

function normalizeItem(x: unknown): CollectionItem | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const title = str(o.title);
  if (!title) return null;

  const tags = collectTags(o);
  const authors = str(o.authors) || undefined;
  const source = str(o.source) || undefined;
  const explicitLabel = str(o.label) || str(o.period) || str(o.term) || str(o.date) || undefined;
  const year = str(o.year) || undefined;

  // authors/source present → a bibliographic citation; otherwise a plain entry.
  if (authors || source) {
    return {
      kind: "citation",
      label: explicitLabel,
      authors,
      title,
      source,
      year,
      url: safeHref(str(o.url) || undefined),
      tags,
    };
  }
  return {
    kind: "entry",
    label: explicitLabel ?? year,
    title,
    description: str(o.description) || str(o.note) || undefined,
    tags,
  };
}

/** Filter chips = "All" + the union of tags in first-seen order (none → []). */
function deriveFilters(items: CollectionItem[]): string[] {
  const seen: string[] = [];
  for (const it of items) {
    for (const t of it.tags) if (!seen.includes(t)) seen.push(t);
  }
  return seen.length ? ["All", ...seen] : [];
}

/**
 * Parse a YAML code-block body into a render-ready {@link CollectionData}.
 * Returns `null` when the YAML is missing, invalid, not a mapping, or produces
 * no non-empty sections — the caller should then render the page normally.
 */
export function parseCollection(
  yamlText: string,
  opts: ParseCollectionOptions = {},
): CollectionData | null {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const titles = opts.titles ?? {};

  const keys = (opts.order ?? Object.keys(obj)).filter(
    (k) => Array.isArray(obj[k]) && (obj[k] as unknown[]).length > 0,
  );

  const sections: CollectionSection[] = [];
  for (const key of keys) {
    const arr = obj[key] as unknown[];
    const items = arr.map(normalizeItem).filter((x): x is CollectionItem => x !== null);
    if (!items.length) continue;
    const hasLabels = items.some((i) => !!i.label);
    const labelStyle: "period" | "year" = arr.some(
      (x) => x != null && typeof x === "object" && "period" in (x as object),
    )
      ? "period"
      : "year";
    sections.push({
      key,
      title: titles[key] ?? humanize(key),
      hasLabels,
      labelStyle,
      items,
      filters: deriveFilters(items),
    });
  }

  return sections.length ? { sections } : null;
}

/**
 * Render a trusted-author string to HTML, converting `[text](url)` markdown
 * links to anchors. Everything is HTML-escaped first and only http(s)/mailto/
 * relative/fragment hrefs become links, so the result is safe to `set:html`.
 */
export function renderInlineLinks(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let out = "";
  let last = 0;
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let m = re.exec(text);
  while (m !== null) {
    const label = m[1] ?? "";
    const href = m[2] ?? "";
    out += esc(text.slice(last, m.index));
    if (SAFE_HREF.test(href)) {
      out += `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
    } else {
      out += esc(label);
    }
    last = m.index + m[0].length;
    m = re.exec(text);
  }
  out += esc(text.slice(last));
  return out;
}
