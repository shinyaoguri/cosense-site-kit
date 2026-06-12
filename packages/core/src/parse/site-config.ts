import { parse as parseYaml } from "yaml";
import type { CosenseSitePage } from "../schema/v1/page";
import { type SiteStructure, siteStructureSchema } from "../schema/v1/site-structure";

// File names accepted for the YAML config block inside the site-config page.
// Authors usually write `code:site.yaml`; `site.yml` is accepted as a courtesy.
const ACCEPTED_FILENAMES = new Set(["site.yaml", "site.yml"]);

export class SiteConfigParseError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SiteConfigParseError";
  }
}

// Result of inspecting a site-config page.
export interface SiteConfigResult {
  structure: SiteStructure;
  /** Notes worth surfacing to the user via doctor / logger (non-fatal). */
  warnings: string[];
}

// Pull the YAML block out of a page and validate it. Returns null when the
// page has no `code:site.yaml` block (caller treats this as "no config").
// Throws SiteConfigParseError on malformed YAML or schema-invalid content.
export function parseSitePage(page: CosenseSitePage): SiteConfigResult | null {
  const codeBlocks = page.blocks.filter(
    (b): b is Extract<typeof b, { type: "code" }> =>
      b.type === "code" && b.filename !== undefined && ACCEPTED_FILENAMES.has(b.filename),
  );
  if (codeBlocks.length === 0) return null;

  const warnings: string[] = [];
  if (codeBlocks.length > 1) {
    warnings.push(
      `Page "${page.title}" has ${codeBlocks.length} site.yaml blocks; using the first.`,
    );
  }
  const block = codeBlocks[0];
  if (!block) return null;

  let parsed: unknown;
  try {
    parsed = parseYaml(block.value);
  } catch (err) {
    throw new SiteConfigParseError(
      `YAML parse error in ${block.filename} on page "${page.title}": ${(err as Error).message}`,
      err,
    );
  }

  if (parsed === null || parsed === undefined) {
    return { structure: siteStructureSchema.parse({}), warnings };
  }

  const result = siteStructureSchema.safeParse(parsed);
  if (!result.success) {
    throw new SiteConfigParseError(
      `site.yaml does not match the expected schema on page "${page.title}":\n${result.error.message}`,
      result.error,
    );
  }
  // safeParse succeeds even when keys are silently lost: strict nested objects
  // (home, posts) drop unknown keys, and the `.loose()` top level keeps
  // unrecognized ones. Either way a misindented or misspelled key vanishes with
  // no error, so re-check the input and surface those as non-fatal warnings.
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    warnings.push(...lintIgnoredKeys(parsed as Record<string, unknown>, page.title));
  }
  return { structure: result.data, warnings };
}

// --- site.yaml lint: surface keys the schema silently ignores ----------------
// Two schema behaviours combine into "silent failure": strict nested objects
// (home, posts) drop unknown keys, and the `.loose()` top level keeps
// unrecognized keys (so plugins can ship custom sections like `members:`). The
// reported bug: indenting `nav:` under `home:` left the header nav empty with no
// warning. We compare the parsed input against the schema's own key sets — read
// from the schema so they can't drift — and warn (non-fatally) about ignores.

const KNOWN_TOP_LEVEL_KEYS = shapeKeys(siteStructureSchema);
const KNOWN_HOME_KEYS = shapeKeys(siteStructureSchema.shape.home);
const KNOWN_POSTS_KEYS = shapeKeys(siteStructureSchema.shape.posts);

function lintIgnoredKeys(input: Record<string, unknown>, pageTitle: string): string[] {
  const warnings: string[] = [];
  const where = `site.yaml on page "${pageTitle}"`;

  // The top level is `.loose()`, so unknown keys survive instead of erroring. We
  // only flag ones that look like a misspelling or misplacement of a known key —
  // genuinely custom sections (e.g. `members:`, `profile:`) don't resemble any
  // known key and are left alone, preserving the plugin passthrough contract.
  if (KNOWN_TOP_LEVEL_KEYS.length > 0) {
    for (const key of Object.keys(input)) {
      if (KNOWN_TOP_LEVEL_KEYS.includes(key)) continue;
      const near = nearestKnownKey(key, KNOWN_TOP_LEVEL_KEYS);
      if (near) {
        warnings.push(
          `${where}: unknown top-level key "${key}" is ignored — did you mean "${near}"? Check spelling and indentation.`,
        );
      }
    }
  }

  // Strict nested objects drop unknown keys outright. The classic slip is
  // indenting a top-level block (typically `nav:`) under `home:`.
  lintNestedObject(input, "home", KNOWN_HOME_KEYS, warnings, where, true);
  lintNestedObject(input, "posts", KNOWN_POSTS_KEYS, warnings, where, false);

  return warnings;
}

function lintNestedObject(
  input: Record<string, unknown>,
  key: string,
  known: string[],
  warnings: string[],
  where: string,
  suggestTopLevel: boolean,
): void {
  if (known.length === 0) return; // schema introspection failed; skip, don't misfire
  const node = input[key];
  if (node === null || typeof node !== "object" || Array.isArray(node)) return;
  const extra = Object.keys(node).filter((k) => !known.includes(k));
  if (extra.length === 0) return;
  const quoted = extra.map((k) => `"${k}"`).join(", ");
  const hint = suggestTopLevel
    ? ` Did you mean to place ${extra.length === 1 ? "it" : "them"} at the top level, as a sibling of "${key}:"?`
    : "";
  warnings.push(`${where}: "${key}:" does not support ${quoted}; ignored.${hint}`);
}

// A likely misspelling/variant of a known key: case-only difference, a prefix
// relationship (`nav` → `navigation`), or a small edit distance. Returns the
// matched known key, or null when `key` resembles none (treat as intentional).
function nearestKnownKey(key: string, known: string[]): string | null {
  const a = key.toLowerCase();
  for (const k of known) {
    const b = k.toLowerCase();
    if (a === b || a.startsWith(b) || b.startsWith(a) || levenshtein(a, b) <= 2) return k;
  }
  return null;
}

// Peel optional/default/nullable wrappers off a schema node, then read a
// ZodObject's declared keys. Returns [] when the node isn't (or doesn't wrap) an
// object — callers skip their check rather than treat every key as unknown.
function shapeKeys(schema: unknown): string[] {
  let s = schema as { unwrap?: () => unknown; shape?: Record<string, unknown> };
  while (s && typeof s.unwrap === "function" && !s.shape) {
    s = s.unwrap() as typeof s;
  }
  return s?.shape ? Object.keys(s.shape) : [];
}

// Standard Levenshtein edit distance. Indices stay in bounds, so the `?? 0`
// guards (required by noUncheckedIndexedAccess) never actually trigger.
function levenshtein(a: string, b: string): number {
  const row: number[] = [];
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(above + 1, (row[j - 1] ?? 0) + 1, prevDiag + cost);
      prevDiag = above;
    }
  }
  return row[b.length] ?? 0;
}
