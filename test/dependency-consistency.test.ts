import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Repo-level guards against the dependabot failure modes catalogued in #136.
// dependabot only rewrites the manifests it knows about; anything that has to
// follow a bump by hand (peerDependencies ranges, tool config schemas) silently
// drifts and the PR either goes red for a non-obvious reason or — worse — merges
// green and breaks consumers. These assert the follow-up in CI so the dependabot
// PR itself fails until the hand edit lands.

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

type Manifest = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const readManifest = (relative: string): Manifest =>
  JSON.parse(readFileSync(join(repoRoot, relative), "utf8"));

/** `^7.1.3` -> 7. Throws on ranges this guard cannot reason about. */
const majorOf = (spec: string): number => {
  const m = /^\^?(\d+)\./.exec(spec.trim());
  if (!m) throw new Error(`unsupported version spec for this guard: ${spec}`);
  return Number(m[1]);
};

/** `^5.0.0 || ^6.0.0 || ^7.0.0` -> [5, 6, 7]. */
const majorsInRange = (range: string): number[] => range.split("||").map(majorOf);

// Packages published to npm that declare an astro peer range, plus every place
// the repo pins astro itself. Kept explicit rather than globbed so a new package
// has to be added here deliberately.
const PUBLISHED_WITH_ASTRO_PEER = [
  "packages/astro/package.json",
  "packages/theme-default/package.json",
  "packages/theme-utils/package.json",
];

const ASTRO_CONSUMERS = [
  "packages/astro/package.json",
  "packages/theme-default/package.json",
  "packages/theme-utils/package.json",
  "site/package.json",
];

describe("astro peerDependencies vs the astro we build against", () => {
  // #136 pattern 3: a framework major bump only touches devDependencies, so the
  // published peerDependencies stay on the old range and consumers hit ERESOLVE
  // (this is exactly what stalled shinyaoguri.com on astro 7 — see #140).
  const usedMajors = new Set(
    ASTRO_CONSUMERS.map((path) => {
      const manifest = readManifest(path);
      const spec = manifest.devDependencies?.astro ?? manifest.dependencies?.astro;
      if (!spec) throw new Error(`${path} no longer pins astro; update ASTRO_CONSUMERS`);
      return majorOf(spec);
    }),
  );

  it("pins astro somewhere so this guard has something to compare against", () => {
    expect(usedMajors.size).toBeGreaterThan(0);
  });

  for (const path of PUBLISHED_WITH_ASTRO_PEER) {
    it(`${path} accepts every astro major the repo builds against`, () => {
      const peer = readManifest(path).peerDependencies?.astro;
      if (!peer) throw new Error(`${path} no longer declares an astro peer range`);
      const accepted = majorsInRange(peer);
      for (const major of usedMajors) {
        expect(accepted, `peerDependencies.astro is "${peer}"`).toContain(major);
      }
    });
  }
});

describe("biome config schema vs the biome we install", () => {
  // #136 pattern 2: a lint/format tool major bump requires a config migration
  // (`biome migrate`). Without it `biome check` fails on a config deserialize
  // diagnostic, which reads as an unrelated lint failure. Comparing against the
  // declared range (not the resolved install) means routine patch releases stay
  // quiet and only a manifest bump demands the migration.
  it("keeps biome.json $schema on the version package.json declares", () => {
    const declared = readManifest("package.json").devDependencies?.["@biomejs/biome"];
    if (!declared) throw new Error("root package.json no longer devDepends on @biomejs/biome");
    const installed = declared.replace(/^[\^~]/, "");

    const biomeConfig = JSON.parse(readFileSync(join(repoRoot, "biome.json"), "utf8")) as {
      $schema?: string;
    };
    expect(biomeConfig.$schema).toBe(`https://biomejs.dev/schemas/${installed}/schema.json`);
  });
});
