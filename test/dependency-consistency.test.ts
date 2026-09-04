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

const readText = (relative: string): string => readFileSync(join(repoRoot, relative), "utf8");

const readManifest = (relative: string): Manifest => JSON.parse(readText(relative));

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
  // declared range means the check tracks what dependabot actually rewrites.
  //
  // Compared at major.minor only. Config options are added and removed on
  // minor boundaries, so that is where a stale $schema stops describing the
  // installed biome; a patch bump (2.5.6 -> 2.5.7) changes nothing about the
  // config surface, and demanding a $schema edit for it would turn every
  // routine group bump red for no reason (it did — see #145).
  it("keeps biome.json $schema on the minor package.json declares", () => {
    const declared = readManifest("package.json").devDependencies?.["@biomejs/biome"];
    if (!declared) throw new Error("root package.json no longer devDepends on @biomejs/biome");

    const biomeConfig = JSON.parse(readFileSync(join(repoRoot, "biome.json"), "utf8")) as {
      $schema?: string;
    };
    const schemaVersion = /schemas\/([\d.]+)\/schema\.json$/.exec(biomeConfig.$schema ?? "")?.[1];
    if (!schemaVersion) throw new Error(`unrecognised biome $schema: ${biomeConfig.$schema}`);

    const minor = (version: string) =>
      version
        .replace(/^[\^~]/, "")
        .split(".")
        .slice(0, 2)
        .join(".");
    expect(minor(schemaVersion), `biome.json $schema is ${biomeConfig.$schema}`).toBe(
      minor(declared),
    );
  });
});

describe("changesets/action pin vs the @changesets/cli we install", () => {
  // #136 pattern 3, applied to a pinned action: dependabot rewrites the SHA and
  // nothing else, but a changesets/action major bump needs two hand edits it
  // never makes. v2 refuses a Changesets CLI v2 project outright (it tells you to
  // use action v1), and it renamed every input. GitHub Actions treats an unknown
  // input as a warning, so the lone SHA bump merges green — ci.yml never runs
  // release.yml — and the release only stops working at the next release.
  const releaseWorkflow = readText(".github/workflows/release.yml");

  // The pin is a SHA plus the human-readable version in a trailing comment; that
  // comment is the only place the major is legible, so the guard needs it there.
  const pin = /uses:\s*changesets\/action@([0-9a-f]{40})\s*#\s*v(\d+)\.\d+\.\d+/.exec(
    releaseWorkflow,
  );

  /** action major -> the @changesets/cli major it works with. */
  const CLI_MAJOR_BY_ACTION_MAJOR: Record<number, number> = { 1: 2, 2: 3 };

  /**
   * Inputs each action major understands. `forbidden` also covers the v1-only
   * `GITHUB_TOKEN:` env entry, which v2 ignores in favour of the input — the one
   * drift that would let the action run without a token at all.
   */
  const INPUTS_BY_ACTION_MAJOR: Record<number, { required: string[]; forbidden: string[] }> = {
    1: {
      required: ["version", "publish"],
      forbidden: ["version-script", "publish-script", "commit-message", "pr-title"],
    },
    2: {
      required: ["version-script", "publish-script", "github-token"],
      forbidden: [
        "version",
        "publish",
        "commit",
        "title",
        "branch",
        "commit-mode",
        "setup-git-user",
        "GITHUB_TOKEN",
      ],
    },
  };

  /** A mapping key at the start of a line, so `version` never matches `node-version`. */
  const declares = (key: string) => new RegExp(`^\\s+${key}:`, "m").test(releaseWorkflow);

  it("pins changesets/action by SHA with the version in a comment", () => {
    expect(pin, "release.yml must pin changesets/action@<40-char sha> # vX.Y.Z").not.toBeNull();
  });

  it("moves @changesets/cli major together with the pinned action major", () => {
    if (!pin) throw new Error("no changesets/action pin to compare against");
    const actionMajor = Number(pin[2]);
    const expected = CLI_MAJOR_BY_ACTION_MAJOR[actionMajor];
    if (expected === undefined) {
      throw new Error(
        `changesets/action v${actionMajor} is not in this guard's table — read its release notes and add the CLI major it requires`,
      );
    }

    const declared = readManifest("package.json").devDependencies?.["@changesets/cli"];
    if (!declared) throw new Error("root package.json no longer devDepends on @changesets/cli");

    expect(majorOf(declared), `changesets/action is pinned to v${actionMajor}`).toBe(expected);
  });

  it("passes the inputs of the pinned action major, and none of the other major's", () => {
    if (!pin) throw new Error("no changesets/action pin to compare against");
    const actionMajor = Number(pin[2]);
    const inputs = INPUTS_BY_ACTION_MAJOR[actionMajor];
    if (!inputs) {
      throw new Error(
        `changesets/action v${actionMajor} is not in this guard's table — read its release notes and add its input names`,
      );
    }

    for (const key of inputs.required) {
      expect(declares(key), `release.yml is missing \`${key}:\` for action v${actionMajor}`).toBe(
        true,
      );
    }
    for (const key of inputs.forbidden) {
      expect(
        declares(key),
        `release.yml still passes \`${key}:\`, which action v${actionMajor} ignores`,
      ).toBe(false);
    }
  });
});

describe("changeset config schema vs the @changesets/config npm resolves", () => {
  // #136 pattern 2 one level down. The schema lives in @changesets/config, which
  // this repo never declares — it arrives through @changesets/cli — so a CLI major
  // bump leaves .changeset/config.json describing itself with the old schema, and
  // an editor validates the config against options that have moved.
  //
  // Compared at major only, unlike the biome guard above: that $schema tracks a
  // range we declare ourselves, while this one tracks a transitive resolution that
  // can move on any `npm install`. Demanding a $schema edit for those would turn
  // unrelated PRs red, which is the failure mode #145 had to undo.
  it("keeps .changeset/config.json $schema on the major npm resolves", () => {
    const lock = JSON.parse(readText("package-lock.json")) as {
      packages?: Record<string, { version?: string }>;
    };
    const resolved = lock.packages?.["node_modules/@changesets/config"]?.version;
    if (!resolved) {
      throw new Error("package-lock.json no longer resolves @changesets/config at the root");
    }

    const config = JSON.parse(readText(".changeset/config.json")) as { $schema?: string };
    const declared = /@changesets\/config@([\d.]+)\/schema\.json$/.exec(config.$schema ?? "")?.[1];
    if (!declared) throw new Error(`unrecognised changeset $schema: ${config.$schema}`);

    expect(majorOf(declared), `.changeset/config.json $schema is ${config.$schema}`).toBe(
      majorOf(resolved),
    );
  });
});
