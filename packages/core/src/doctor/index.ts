import type { CosenseSiteConfig } from "../config";
import { buildIntermediate, type ProgressEvent } from "../pipeline";
import type { IntermediateData } from "../schema/v1/page";
import type { SiteSource } from "../source/types";

// A single diagnostic finding. Doctor checks return one of these per check.
export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  /** Optional bullet list of specific items (broken links, missing pages, etc). */
  details?: string[];
}

export interface DoctorReport {
  /** false if any check returned "fail". */
  ok: boolean;
  checks: DoctorCheck[];
  /** Set when the pipeline itself crashed; checks will be partial. */
  fatalError?: string;
}

export interface RunDoctorOptions {
  config: CosenseSiteConfig;
  cacheDir?: string;
  force?: boolean;
  source?: SiteSource;
  onProgress?: (e: ProgressEvent) => void;
}

// Runs the full pipeline once and then analyzes the resulting IntermediateData
// for the kinds of issues you can only see after fetch+parse: broken page
// links, structure references that don't resolve, slug collisions, draft-tag
// leaks, etc. Network and parse failures are caught and reported as fatal
// rather than thrown — the doctor's job is to surface problems, not abort.
export async function runDoctor(opts: RunDoctorOptions): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  let data: IntermediateData;
  try {
    data = await buildIntermediate({
      config: opts.config,
      cacheDir: opts.cacheDir,
      force: opts.force,
      source: opts.source,
      onProgress: opts.onProgress,
    });
  } catch (err) {
    return {
      ok: false,
      checks,
      fatalError: err instanceof Error ? err.message : String(err),
    };
  }

  checks.push(checkPipelineWarnings(data));
  checks.push(checkPublishOutcome(data));
  checks.push(checkSiteConfigPage(opts.config, data));
  checks.push(checkNavReferences(data));
  checks.push(checkHomeReference(data));
  checks.push(checkFeaturedReferences(data));
  checks.push(checkPostsTagHasContent(data));
  checks.push(checkOrphanPosts(data));
  checks.push(checkRedirectDestinations(data));
  checks.push(checkBrokenPageLinks(data));
  checks.push(checkTemplateUsage(data));
  checks.push(checkTemplateMapping(data));
  checks.push(checkSlugCollisions(data));
  checks.push(checkDraftLeak(opts.config, data));

  return {
    ok: !checks.some((c) => c.status === "fail"),
    checks,
  };
}

function checkPipelineWarnings(data: IntermediateData): DoctorCheck {
  if (data.warnings.length === 0) {
    return { name: "Pipeline warnings", status: "pass", message: "none" };
  }
  return {
    name: "Pipeline warnings",
    status: "warn",
    message: `${data.warnings.length} warning(s) during build`,
    details: data.warnings,
  };
}

function checkPublishOutcome(data: IntermediateData): DoctorCheck {
  const kept = data.pages.length;
  if (kept === 0) {
    return {
      name: "Publish rules produce pages",
      status: "fail",
      message: `0 pages published (${data.excluded.length} excluded). Check publish.includeTags and publish.default.`,
    };
  }
  return {
    name: "Publish rules produce pages",
    status: "pass",
    message: `${kept} kept, ${data.excluded.length} excluded`,
  };
}

function checkSiteConfigPage(
  config: CosenseSiteConfig,
  data: IntermediateData,
): DoctorCheck {
  if (config.siteConfig.page === null) {
    return {
      name: "Site-config page",
      status: "pass",
      message: "disabled (siteConfig.page = null)",
    };
  }
  const pageTitle = config.siteConfig.page;
  const isExcluded = data.excluded.some(
    (e) => e.title === pageTitle && e.reason === "site-config page",
  );
  if (!isExcluded) {
    return {
      name: "Site-config page",
      status: "warn",
      message: `"${pageTitle}" not found. Using default empty structure.`,
    };
  }
  return {
    name: "Site-config page",
    status: "pass",
    message: `"${pageTitle}" parsed successfully`,
  };
}

function checkNavReferences(data: IntermediateData): DoctorCheck {
  const titles = new Set(data.pages.map((p) => p.title));
  const broken: string[] = [];
  for (const item of data.structure.nav) {
    if ("page" in item && !titles.has(item.page)) broken.push(item.page);
  }
  if (broken.length === 0) {
    return {
      name: "Nav references resolve",
      status: "pass",
      message: `${data.structure.nav.length} nav item(s) all resolve`,
    };
  }
  return {
    name: "Nav references resolve",
    status: "fail",
    message: `${broken.length} nav reference(s) point to missing pages`,
    details: broken.map((p) => `"${p}" is not a published page`),
  };
}

function checkHomeReference(data: IntermediateData): DoctorCheck {
  const home = data.structure.home?.page;
  if (!home) {
    return {
      name: "Home reference resolves",
      status: "pass",
      message: "home.page not configured",
    };
  }
  const titles = new Set(data.pages.map((p) => p.title));
  if (!titles.has(home)) {
    return {
      name: "Home reference resolves",
      status: "fail",
      message: `home.page "${home}" is not a published page`,
    };
  }
  return {
    name: "Home reference resolves",
    status: "pass",
    message: `home.page "${home}" found`,
  };
}

function checkFeaturedReferences(data: IntermediateData): DoctorCheck {
  if (data.structure.featured.length === 0) {
    return {
      name: "Featured references resolve",
      status: "pass",
      message: "none configured",
    };
  }
  const titles = new Set(data.pages.map((p) => p.title));
  const missing = data.structure.featured.filter((t) => !titles.has(t));
  if (missing.length === 0) {
    return {
      name: "Featured references resolve",
      status: "pass",
      message: `${data.structure.featured.length} featured item(s) all resolve`,
    };
  }
  return {
    name: "Featured references resolve",
    status: "warn",
    message: `${missing.length} featured page(s) not published — will be silently dropped`,
    details: missing.map((t) => `"${t}"`),
  };
}

function checkPostsTagHasContent(data: IntermediateData): DoctorCheck {
  const tag = data.structure.posts?.tag;
  if (!tag) {
    return { name: "Posts tag has content", status: "pass", message: "posts not configured" };
  }
  const count = data.pages.filter((p) => p.tags.includes(tag)).length;
  if (count === 0) {
    return {
      name: "Posts tag has content",
      status: "warn",
      message: `No published page is tagged #${tag} — /posts feed will be empty`,
    };
  }
  return {
    name: "Posts tag has content",
    status: "pass",
    message: `${count} page(s) tagged #${tag}`,
  };
}

// A page tagged with the posts.tag but missing #publish is almost always a
// mistake — the author intended a blog post but it never reaches the feed
// because publish rules run first. Surface it explicitly so users don't have
// to read excluded[] manually to figure out the gap.
function checkOrphanPosts(data: IntermediateData): DoctorCheck {
  const tag = data.structure.posts?.tag;
  if (!tag) return { name: "No orphan posts", status: "pass", message: "posts not configured" };
  const orphans = data.excluded
    .filter((e) => e.tags?.includes(tag))
    .map((e) => e.title);
  if (orphans.length === 0) {
    return { name: "No orphan posts", status: "pass", message: `every #${tag} page is published` };
  }
  return {
    name: "No orphan posts",
    status: "warn",
    message: `${orphans.length} page(s) tagged #${tag} but missing #publish — add #publish to surface them in /posts`,
    details: orphans.map((t) => `"${t}"`),
  };
}

function checkRedirectDestinations(data: IntermediateData): DoctorCheck {
  const entries = Object.entries(data.structure.redirects);
  if (entries.length === 0) {
    return { name: "Redirect destinations exist", status: "pass", message: "no redirects" };
  }
  const slugs = new Set(data.pages.map((p) => p.slug));
  const broken: string[] = [];
  for (const [from, to] of entries) {
    if (!slugs.has(to)) broken.push(`${from} → ${to}`);
  }
  if (broken.length === 0) {
    return {
      name: "Redirect destinations exist",
      status: "pass",
      message: `${entries.length} redirect(s) point to existing pages`,
    };
  }
  return {
    name: "Redirect destinations exist",
    status: "warn",
    message: `${broken.length} redirect destination(s) not found`,
    details: broken,
  };
}

function checkBrokenPageLinks(data: IntermediateData): DoctorCheck {
  // We only count pageLinks whose target is missing AFTER publish/link
  // resolution. resolveInternalLinks() set exists=false on those.
  const broken = new Map<string, string[]>(); // missing target -> source titles
  for (const page of data.pages) {
    walkInlines(page.blocks, (n) => {
      if (n.type === "pageLink" && n.exists === false) {
        const title = n.title as string;
        const sources = broken.get(title) ?? [];
        if (!sources.includes(page.title)) sources.push(page.title);
        broken.set(title, sources);
      }
    });
  }
  if (broken.size === 0) {
    return { name: "Internal page links resolve", status: "pass", message: "no broken links" };
  }
  const top = Array.from(broken.entries()).slice(0, 8);
  return {
    name: "Internal page links resolve",
    status: "warn",
    message: `${broken.size} broken page link target(s)`,
    details: top.map(
      ([target, sources]) =>
        `"${target}" referenced by ${sources.length} page(s)${
          sources.length <= 3 ? ` (${sources.map((s) => `"${s}"`).join(", ")})` : ""
        }`,
    ),
  };
}

// Report which page-level templates are in use. core doesn't know what
// templates the theme actually supports (themes hold their own registry), so
// this check never fails — it just surfaces the breakdown so users can spot
// "I added #template/profil but it didn't take" by missing counts.
function checkTemplateUsage(data: IntermediateData): DoctorCheck {
  const counts = new Map<string, number>();
  for (const p of data.pages) counts.set(p.template, (counts.get(p.template) ?? 0) + 1);
  if (counts.size <= 1) {
    return {
      name: "Template usage",
      status: "pass",
      message: `all ${data.pages.length} page(s) use the default template`,
    };
  }
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return {
    name: "Template usage",
    status: "pass",
    message: `${counts.size} templates in use`,
    details: entries.map(([name, n]) => `${n}× ${name}`),
  };
}

// Validate that .site site.yaml's `templates:` mapping refers to titles that
// actually exist among published pages. A typo here silently does nothing
// because the mapping never matches; surface it explicitly.
function checkTemplateMapping(data: IntermediateData): DoctorCheck {
  const entries = Object.entries(data.structure.templates);
  if (entries.length === 0) {
    return { name: "Template mapping titles", status: "pass", message: "no mappings" };
  }
  const titles = new Set(data.pages.map((p) => p.title));
  const missing = entries
    .filter(([title]) => !titles.has(title))
    .map(([title, template]) => `"${title}" → ${template}`);
  if (missing.length === 0) {
    return {
      name: "Template mapping titles",
      status: "pass",
      message: `${entries.length} mapping(s) all resolve`,
    };
  }
  return {
    name: "Template mapping titles",
    status: "warn",
    message: `${missing.length} title(s) in .site templates do not match any published page`,
    details: missing,
  };
}

function checkSlugCollisions(data: IntermediateData): DoctorCheck {
  const counts = new Map<string, number>();
  for (const p of data.pages) counts.set(p.slug, (counts.get(p.slug) ?? 0) + 1);
  const dupes = Array.from(counts.entries()).filter(([, n]) => n > 1);
  if (dupes.length === 0) {
    return { name: "No slug collisions", status: "pass", message: "all slugs unique" };
  }
  // assignSlugs already disambiguates with numeric suffixes, so reaching this
  // branch indicates an upstream bug — surface it loudly.
  return {
    name: "No slug collisions",
    status: "fail",
    message: `${dupes.length} duplicate slug(s) after assignment`,
    details: dupes.map(([slug, n]) => `${slug} appears ${n}x`),
  };
}

function checkDraftLeak(
  config: CosenseSiteConfig,
  data: IntermediateData,
): DoctorCheck {
  const excludeTags = new Set(config.publish.excludeTags);
  const leaked: string[] = [];
  for (const p of data.pages) {
    if (p.tags.some((t) => excludeTags.has(t))) leaked.push(p.title);
  }
  if (leaked.length === 0) {
    return { name: "No draft leak", status: "pass", message: "no excluded-tag pages published" };
  }
  return {
    name: "No draft leak",
    status: "fail",
    message: `${leaked.length} page(s) published despite carrying an excluded tag`,
    details: leaked,
  };
}

// Walk inline nodes (paragraph/heading/list children) and invoke `fn` for each.
function walkInlines(
  blocks: IntermediateData["pages"][number]["blocks"],
  fn: (node: InlineLike) => void,
): void {
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "list") {
      for (const node of block.children) visit(node as InlineLike, fn);
    }
  }
}

type InlineLike = { type: string } & Record<string, unknown>;

function visit(node: InlineLike, fn: (n: InlineLike) => void): void {
  fn(node);
  const children = (node as { children?: unknown }).children;
  if (Array.isArray(children)) {
    for (const c of children) visit(c as InlineLike, fn);
  }
}
