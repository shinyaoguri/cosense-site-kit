# cosense-site-kit

A small SSG framework that turns a public [Cosense](https://scrapbox.io) (formerly Scrapbox) project into a static site — personal pages, lab sites, project sites, course sites.

Author in Cosense, publish to Cloudflare Workers Static Assets or GitHub Pages, GitHub Actions cron handles the rest.

> Status: pre-1.0. MVP works end-to-end against real public projects.

## What it gives you

- **Cosense as a CMS.** Pages tagged `#publish` become routes on your site; everything else stays hidden.
- **A `.site` config page in Cosense itself.** Declare your nav, home page, blog feed, featured pages, and redirects in YAML right next to the rest of your notes — no redeploy required to change site structure.
- **Stable intermediate model.** The Cosense API is treated as an unstable internal API and isolated inside `core`; themes consume a versioned, zod-validated intermediate schema.
- **First-class doctor.** `cosense-site doctor` finds broken nav references, dead internal links, draft leaks, and zero-page configs before they ship.
- **One command from zero to running site.** `npm create cosense-site my-site` produces a working starter.

## Quick start

```bash
npm create cosense-site my-site --title "My Site" --url "https://example.com" --project "your-public-cosense-project" --yes
cd my-site
npm install
npm run fetch         # pull pages from Cosense → .cosense-cache/
npm run dev           # http://localhost:4321
```

Without flags, the scaffolder prompts interactively.

## Publishing pages

By default the framework publishes nothing — you opt each page in.

| Tag | Effect |
|---|---|
| `#publish` | Page is included in the build (`publish.includeTags`). |
| `#draft` / `#private` / `#internal` | Page is excluded even if `#publish` is also present (`publish.excludeTags`). |
| `#slug/research` | Override the URL slug. Without this, the slug derives from the title. |
| `#post` (configurable) | Page appears in the `/posts` feed and "Recent posts" list on the home. The tag name is set in `.site` YAML. |

Switch the default with `publish.default: "all"` in `cosense.config.ts` if you want to publish everything except `#draft`.

## The `.site` page

Create a Cosense page titled `.site` (the leading dot avoids Cosense's `_` → space substitution). Put one `code:site.yaml` block in it; the rest of the page can be free-form notes.

```
.site

This page declares the site structure. Edit the YAML below; the next build picks it up.

code:site.yaml
 home:
   page: "ABOUT ME"

 nav:
   - { label: "About",    page: "ABOUT ME" }
   - { label: "Research", page: "Research" }
   - { label: "GitHub",   href: "https://github.com/you" }

 posts:
   tag: "post"
   limit: 10

 featured:
   - "代表的な作品"
   - "おすすめページ"

 redirects:
   legacy-about: about
   old-slug:    new-slug
```

The YAML schema:

| Field | Type | Notes |
|---|---|---|
| `home.page` | Cosense page title | Rendered as the home body. Falls back to a "recent pages" list. |
| `nav[]` | `{label, page}` or `{label, href}` | Top-bar items. `page` is a Cosense title; `href` is any URL. |
| `posts.tag` | string | Pages tagged this way show up in `/posts` and on the home. |
| `posts.limit` | number | Cap on the home's "Recent posts" section. |
| `featured[]` | Cosense page titles | Highlighted block on the home page. |
| `redirects` | `{oldSlug: newSlug}` | Wired into Astro's redirects config. |

Unknown top-level keys are preserved (zod `passthrough`) so themes or plugins can ship their own sections (e.g. `profile:`, `members:`) without modifying core.

### What happens if `.site` doesn't exist

Everything still works — you get a flat list of recent pages, no nav, no posts route. The `.site` page is **opt-in**.

## Architecture

```
Cosense public project
   │
   │  list + incremental fetch (cache: .cosense-cache/)
   ▼
@cosense-site-kit/core
   • fetch / parse / normalize / validate
   • publish filter (include/exclude tags)
   • slug + link resolution + backlinks
   • parses .site site.yaml → SiteStructure
   │
   ▼
versioned intermediate JSON  ← stable public contract (schemaVersion: "1")
   │
   ▼
@cosense-site-kit/astro      (Astro Content Loader + Integration)
   │
   ▼
@cosense-site-kit/theme-*    (Astro Integrations that inject routes)
   │
   ▼
static site → CDN (Cloudflare Workers Static Assets / GitHub Pages)
   │
GitHub Actions cron (twice daily by default) rebuilds the whole thing.
```

Key design rule: **Cosense API knowledge lives only in `core/src/source/cosense/` and `core/src/parse/scrapbox.ts`**. Everything else — themes, Astro, CLI — consumes the versioned intermediate model. When the Cosense API moves, exactly two files change.

## Packages

| Package | Role |
|---|---|
| `@cosense-site-kit/core` | Fetch, cache, parse, normalize, schema, pipeline, doctor, config loader |
| `@cosense-site-kit/astro` | `cosense()` Integration + `cosenseLoader` / `cosenseSiteLoader` Content Loaders |
| `@cosense-site-kit/theme-default` | Default theme (Layout, page, tag, posts, home) |
| `@cosense-site-kit/cli` | `cosense-site` binary |
| `create-cosense-site` | Project scaffolder (`npm create cosense-site …`) |
| `@cosense-site-kit/deploy` | Pure generators: GitHub Actions workflow + Cloudflare `wrangler.jsonc` |

## CLI

```
cosense-site init                 Create a starter cosense.config.ts here
cosense-site fetch  [--force]     Pull pages and write .cosense-cache/intermediate.json
cosense-site build                Run the underlying Astro build
cosense-site validate             Parse and summarize cosense.config without fetching
cosense-site doctor [--force]     Diagnose: publish outcome, broken links, structure
cosense-site deploy init          Generate .github/workflows/build.yml and wrangler.jsonc
                                  (target/schedule come from cosense.config.deploy)
```

`doctor` is the single best tool for keeping the site healthy over time. Example output:

```
Doctor report for "my-project"

  ✓ Pipeline warnings  none
  ✓ Publish rules produce pages  23 kept, 132 excluded
  ✓ Site-config page  ".site" parsed successfully
  ✗ Nav references resolve  1 nav reference(s) point to missing pages
      · "Contact" is not a published page
  ⚠ Internal page links resolve  4 broken page link target(s)
      · "Old Topic" referenced by 2 page(s) ("Notes", "Roadmap")
  ✓ No slug collisions  all slugs unique
  ✓ No draft leak  no excluded-tag pages published

Summary: 6 ok, 1 warn, 1 fail
```

Doctor exits 1 on any `fail`, so it plugs cleanly into CI as a pre-deploy gate.

## `cosense.config.ts`

```ts
import { defineCosenseSite } from "@cosense-site-kit/core";

export default defineCosenseSite({
  site: {
    title: "My Site",
    description: "...",
    baseUrl: "https://example.com",
    lang: "ja",
  },

  source: {
    type: "cosense",
    project: "your-public-project",
  },

  publish: {
    default: "none",                                  // or "all"
    includeTags: ["publish"],
    excludeTags: ["draft", "private", "internal"],
  },

  routing: {
    slug: "metadata-or-encoded-title",                // or "title" / "encoded-title"
  },

  siteConfig: {
    page: ".site",                                    // set to null to disable
  },

  deploy: {
    target: "cloudflare-workers",                     // or "github-pages"
    schedule: "17 1,13 * * *",                        // twice daily, off-the-hour
  },
});
```

## Deploy

`cosense-site deploy init` generates:

- `.github/workflows/build.yml` — checkout, restore the Cosense cache, run `cosense-site fetch`, run `astro build`, and either deploy to Workers via `cloudflare/wrangler-action@v3` or publish to GitHub Pages.
- `wrangler.jsonc` (Cloudflare target only) — Workers Static Assets pointed at `./dist`.

The build is meant to run on schedule (cron) plus `workflow_dispatch`. Cosense pages don't change minute-to-minute; twice a day is usually plenty.

Required secrets for Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## How fetch caching works

`.cosense-cache/pages/<shard>/<pageId>.json` holds the last-known body of each page. On every run, `cosense-site fetch` calls the Cosense list endpoint, compares each page's `updated` timestamp against the cache, and only refetches changed pages. The cache survives across CI runs via `actions/cache@v4`, and a network failure mid-build falls back to last-known-good.

`cosense-site fetch --force` ignores the cache and refetches everything.

## Schema versioning

The intermediate model carries `schemaVersion: "1"`. Schema files live under `packages/core/src/schema/v1/` and are re-exported from `@cosense-site-kit/core/schema`. When v2 ships, v1 will stay where it is alongside a migration helper, so themes can pin to a specific schema version and update on their own schedule.

## License

MIT
