// Curated catalog of starter TEMPLATE REPOSITORIES that `create-cosense-site`
// fetches. Each is a GitHub "Use this template" repo that vendors a theme + the
// GitHub Pages workflow and depends on the framework from npm. `--template`
// takes a featured id (below) or any "user/repo".
//
// Adding an official template = one entry here. Third-party templates work via
// `--template user/repo` with no change.

export interface Template {
  /** Short id used on the CLI (`--template <id>`). */
  id: string;
  /** Human label shown in the picker. */
  name: string;
  /** GitHub "user/repo" the template lives in. */
  repo: string;
  /** One-line description for the picker. */
  description: string;
}

export const templates: Template[] = [
  {
    id: "default",
    name: "Default",
    repo: "shinyaoguri/cosense-site-starter",
    description: "Neutral, general-purpose site (theme-default): docs, wiki, notes, personal.",
  },
  {
    id: "lab",
    name: "Lab",
    repo: "shinyaoguri/cosense-site-lab",
    description: "University research lab: members, research, publications, news.",
  },
];

export interface ResolvedTemplate {
  /** GitHub "user/repo". */
  repo: string;
  /** Display label (the featured name, or the repo itself). */
  name: string;
}

const USER_REPO = /^[\w.-]+\/[\w.-]+$/;

// Resolve a `--template` spec to a GitHub repo: a featured id (e.g. "lab"), or
// any "user/repo". Omitted → the first featured template.
export function resolveTemplate(spec?: string): ResolvedTemplate {
  if (!spec) {
    const first = templates[0];
    if (!first) throw new Error("No templates are configured.");
    return { repo: first.repo, name: first.name };
  }
  const featured = templates.find((t) => t.id === spec);
  if (featured) return { repo: featured.repo, name: featured.name };
  if (USER_REPO.test(spec)) return { repo: spec, name: spec };
  const ids = templates.map((t) => t.id).join(", ");
  throw new Error(`Unknown template "${spec}". Use one of: ${ids}, or a "user/repo".`);
}
