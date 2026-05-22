// Curated catalog of THEMES that `create-cosense-site` can scaffold from. Each
// theme is delivered as a GitHub "Use this template" repository that vendors
// the theme + the GitHub Pages workflow and depends on the framework from npm.
// `--theme` takes a featured id (below) or any "user/repo".
//
// Adding an official theme = one entry here. Third-party themes work via
// `--theme user/repo` with no change.

export interface Theme {
  /** Short id used on the CLI (`--theme <id>`). */
  id: string;
  /** Human label shown in the picker. */
  name: string;
  /** GitHub "user/repo" the theme's template repository lives in. */
  repo: string;
  /** One-line description for the picker. */
  description: string;
}

export const themes: Theme[] = [
  {
    id: "default",
    name: "Default",
    repo: "shinyaoguri/cosense-theme-default",
    description: "Neutral, general-purpose theme: docs, wiki, notes, personal.",
  },
  {
    id: "lab",
    name: "Lab",
    repo: "shinyaoguri/cosense-theme-lab",
    description: "University research lab: members, research, publications, news.",
  },
];

export interface ResolvedTheme {
  /** GitHub "user/repo". */
  repo: string;
  /** Display label (the featured name, or the repo itself). */
  name: string;
}

const USER_REPO = /^[\w.-]+\/[\w.-]+$/;

// Resolve a `--theme` spec to a GitHub repo: a featured id (e.g. "lab"), or any
// "user/repo". Omitted → the first featured theme.
export function resolveTheme(spec?: string): ResolvedTheme {
  if (!spec) {
    const first = themes[0];
    if (!first) throw new Error("No themes are configured.");
    return { repo: first.repo, name: first.name };
  }
  const featured = themes.find((t) => t.id === spec);
  if (featured) return { repo: featured.repo, name: featured.name };
  if (USER_REPO.test(spec)) return { repo: spec, name: spec };
  const ids = themes.map((t) => t.id).join(", ");
  throw new Error(`Unknown theme "${spec}". Use one of: ${ids}, or a "user/repo".`);
}
