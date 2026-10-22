import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The generated CSP allows only same-origin scripts (`script-src 'self'`, #205),
// so every script a theme ships must be an Astro-processed <script> (bundled
// to a file — the integration turns off script inlining) and never inline
// code or an event-handler attribute. JSON-LD is a data block, not executed.

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const roots = readdirSync(join(repoRoot, "packages"))
  .filter((p) => p.startsWith("theme-"))
  .map((p) => join(repoRoot, "packages", p, "src"));

function astroFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return astroFiles(path);
    return e.name.endsWith(".astro") ? [path] : [];
  });
}

describe("theme markup stays compatible with script-src 'self'", () => {
  const files = roots.flatMap(astroFiles);

  it("finds the theme sources", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("has no inline scripts other than JSON-LD data blocks", () => {
    for (const file of files) {
      for (const tag of readFileSync(file, "utf8").match(/<script\b[^>]*>/g) ?? []) {
        if (/type="application\/ld\+json"/.test(tag)) continue;
        expect(tag, `${relative(repoRoot, file)}: ${tag}`).not.toMatch(/\bis:inline\b|define:vars/);
      }
    }
  });

  it("has no inline event-handler attributes", () => {
    for (const file of files) {
      const handlers = readFileSync(file, "utf8").match(/<[a-zA-Z][^>]*\son[a-z]+=/g) ?? [];
      expect(handlers, relative(repoRoot, file)).toEqual([]);
    }
  });
});
