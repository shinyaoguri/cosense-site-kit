import { parse as parseYaml } from "yaml";
import type { CosenseSitePage } from "../schema/v1/page";
import {
  siteStructureSchema,
  type SiteStructure,
} from "../schema/v1/site-structure";

// File names accepted for the YAML config block inside the site-config page.
// Authors usually write `code:site.yaml`; `site.yml` is accepted as a courtesy.
const ACCEPTED_FILENAMES = new Set(["site.yaml", "site.yml"]);

export class SiteConfigParseError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
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
  return { structure: result.data, warnings };
}
