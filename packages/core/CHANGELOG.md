# @cosense-site-kit/core

## 0.4.2

### Patch Changes

- 3e1f929: fix(core): harden the local cache against path traversal and truncated icons

  Two defense-in-depth gaps in the cache layer — the data CI carries across runs:

  - **Page-id path traversal**: the page cache joined the raw id into a file path,
    so a spoofed API id like `../../escaped` could write/read outside cacheDir.
    Ids are now validated (`[A-Za-z0-9_-]+`); an unsafe id is a cache miss on read
    and a no-op on write.
  - **Truncated icons reused forever**: icon writes were non-atomic and reuse was
    unconditional, so a build killed mid-write left a 0-byte icon that every later
    build (and CI via actions/cache) reused. Icon writes now use write-then-rename
    (like the page cache), and reuse skips empty files.

- 14972c8: fix: match tags and titles case-insensitively, like Cosense does

  Cosense collapses case-variant tags, links, and titles onto one entity, so
  authors have no way to tell `#Draft` from `#draft`. Several matchers compared
  raw strings, which broke that expectation — most seriously the publish filter,
  where a page tagged `#publish #Draft` slipped past `excludeTags: ["draft"]` and
  was published (the safety rule "exclude always wins" failed _open_).

  All author-supplied tag/title matching now normalizes through a single
  `normalizeKey` helper (shared with internal-link resolution): the publish
  filter, `#published/`/`#updated/`/`#slug/`/`#template/` tag prefixes, the
  `.site` `templates:` and `favicon:` title lookups, the `.site` config page
  detection, the doctor draft-leak and posts-tag checks, theme tag classification
  (`isHiddenTag`/`isPublicTag`/`hidesDates`), 2-hop related-page scoring, and the
  `/posts` feed membership across home/archive/RSS. Display strings keep their
  original case; only matching is normalized.

- 3b3a561: refactor(core): complete the SiteSource abstraction (normalization moves onto the source)

  `source/types.ts` advertised that a new source (esa, Notion, …) could plug in
  without touching the pipeline, but the pipeline imported Cosense's `normalizePage`
  directly and mapped it over every fetched page — so the abstraction didn't hold
  and `SourcePageRaw.text` was implicitly "Scrapbox syntax". `SiteSource` now
  carries a `normalize(raw)` method; the Cosense source implements it (delegating
  to the Scrapbox parser), and the pipeline calls `source.normalize(...)` instead
  of importing source-specific parse code. This makes the abstraction real and
  tightens the isolation rule (Cosense knowledge stays inside `source/cosense/` and
  `parse/scrapbox`). No behavior change.

- 2de33fe: fix(core,theme-utils): harden date conversion against invalid input

  Two date conversions could throw `RangeError: Invalid time value` and crash the
  whole build:

  - **core**: `new Date(raw.created * 1000).toISOString()` in normalize. The wire
    schema's `z.number()` only rejects NaN, so garbage API data (e.g.
    `created: 1e20`) reached `toISOString()` and threw. Epoch→ISO now clamps to the
    valid JS Date range (and treats non-finite as the epoch), so one bad timestamp
    degrades gracefully instead of failing an unattended build.
  - **theme-utils**: `formatDate` called `toISOString()` with no NaN guard, unlike
    the sibling `rfc822` in feed.ts. It's a public helper, so a theme passing any
    string would crash the build. It now returns `undefined` for unparseable input
    (templates already guard with `&&`).

- ed190c2: fix(core): dedupe source list refs by id so a pagination race can't break slugs

  `source.list()` results flowed straight into fetch and slug assignment without
  deduping. Cosense's list API paginates over an updated-desc window, so a page
  edited mid-fetch can appear in two windows. The duplicate was then fetched twice
  and, because `assignSlugs` keys its output by id, collapsed to a single
  collision-suffixed slug (`A-2`) — deleting the canonical `/A`, reshuffling the
  sitemap/feed to the wrong URL, and failing doctor's "No slug collisions" check
  until the next build. `buildIntermediate` now dedupes refs by id (keeping the
  newest `updated`) before fetching.

- e9ac3c9: fix(cli): validate `deploy init --target` and add a pre-publish doctor gate

  Two `deploy init` gaps:

  - `--target` was an unchecked free string. A typo like `--target github-page`
    exited 0 and wrote a workflow that matched neither branch (Cloudflare steps,
    but no wrangler.jsonc) — the failure only surfaced at CI time. It now uses
    commander `.choices()` (clear error + exit 1), backed by a runtime guard in
    `runDeployInit` for programmatic/config callers. Targets come from a single
    `DEPLOY_TARGETS` constant now exported from core and reused by the config
    schema.
  - The generated workflow ran fetch → build → deploy with no `doctor` step, so
    the documented pre-publish gate never ran on the default path — broken nav
    refs / dead links / draft leaks could publish unnoticed. A
    `cosense-site doctor` step is now inserted between fetch and build by default
    (doctor exits 1 only on fail checks, so warnings don't over-block cron);
    `deploy init --no-doctor` opts out. This repo's own build.yml gained the same
    step, and the README documents the gate and the `--force` re-generate path.

- 0c67e12: fix(core): doctor accuracy for site-config and redirect checks

  Two doctor checks misreported, undermining its "pre-publish gate" role:

  - **Site-config false negative**: a broken `.site` YAML (or a page with no
    `code:site.yaml` block) still reported `✓ parsed successfully`, because the
    check only looked at whether the page landed in the excluded list — not the
    parse outcome. The pipeline now emits the parse error on its `site-config`
    progress event, and doctor uses it: a hard parse error fails, a missing
    page/block warns (distinguished in the message), a real parse passes.
  - **Redirect false positive**: the schema allows site-relative redirect
    destinations (`/posts`), but the check compared every destination against the
    page-slug set, so a valid `/posts` redirect warned on every run. Site-relative
    (`/`-prefixed) destinations are now skipped.

- e0b1b5a: fix(core): correct list boundaries in the Scrapbox parser

  Two list-boundary behaviors diverged from how Cosense renders:

  - An indented `[** big]` line was promoted to a top-level heading (heading
    detection ran before the indent check), splitting the surrounding list. Heading
    detection is now limited to unindented lines, so a big-bold _list item_ stays
    in its list.
  - Unordered items used `depth = indent` while ordered items used `depth =
indent + 1`, so a numbered item nested one level deeper than a bullet sibling
    at the same indent. Unordered now uses `indent + 1` too. buildListTree keys off
    relative depth, so homogeneous lists render identically while mixed
    bullet/numbered siblings now sit at the same level.

- 53a1ae2: feat(core): `routing.reservedSlugs` to avoid theme-route collisions

  A Cosense page titled e.g. "Posts" gets slug `posts`, which collides with a
  theme's injected `/posts` route — the page can end up unreachable. `assignSlugs`
  now treats any configured `routing.reservedSlugs` like an existing slug: a page
  that would take one is given a numeric suffix (`posts-2`) with a warning, so the
  theme route keeps the URL and the page stays reachable. Opt-in (default `[]`), so
  no behavior change unless set. THEMES.md documents theme-default's reserved
  routes (`posts`, `tags`).

- e7c30d0: fix(core,theme-utils): unify URL validation and close a redirect open-redirect

  URL safety was validated in three places that had drifted, and the redirect
  check was bypassable:

  - **Open redirect via `.site` redirects (#63)**: `SAFE_REDIRECT` was a
    leading-anchor denylist, so a leading tab/space (`"\t//evil"`) slipped a
    protocol-relative or scheme value through — browsers strip those before
    parsing, resolving it externally. Redirect destinations are now trimmed and
    checked against an allowlist that rejects control chars, protocol-relative
    `//host`, and any scheme.
  - **Divergent SAFE_HREF (#68)**: core allowed `tel:` and rejected `//host`;
    theme-utils' separate copy dropped `tel:` (so a valid `.site` nav `tel:` link
    silently became `#`) and allowed `//host`. Both now use one `safeHref` /
    `isSafeHref` exported from core.
  - **Unenforced inline href invariant (#68c)**: `link`/`image` `href` in the
    schema were bare strings relying on a parser guarantee. They now carry the
    `SAFE_HREF` regex, so a future parser/source regression that let `javascript:`
    through is caught at the model boundary instead of reaching `<a href>`.

- 280561b: fix(core): resolve VERSION from package.json instead of a hardcoded "0.0.0"

  The exported `VERSION` was pinned to `"0.0.0"` while the package shipped 0.4.x,
  and the default Cosense `User-Agent` (`cosense-site-kit/0.0.0`) inherited it — so
  every client reported 0.0.0 to Cosense, defeating identification for rate-limit
  or block analysis. `VERSION` is now read from `package.json` at runtime (same
  approach the CLI uses; resolves from src and bundled dist), and the API's default
  User-Agent uses it. A regression test asserts `VERSION === package.json.version`
  so changesets releases keep it in sync.

## 0.4.1

### Patch Changes

- 89a2b84: `.site` `site.yaml`: a blank field no longer discards the whole config. An empty value parses to YAML `null`, which Zod's `.default()` ignores — so a single blank `featured:` used to fail validation and drop every _other_ setting (home, nav, posts, …) too. Empty values are now normalized before validation: blank list fields fall back to their defaults (`featured:` → `[]`), blank optional sections become absent (`home:`/`posts:`/`theme:`/`favicon:`), a section whose required sub-field is blank (`home:\n  page:`) is treated as absent instead of erroring, and blank entries inside a list are dropped. Valid configs and the existing misspelled/misplaced-key warnings are unaffected.

## 0.4.0

### Minor Changes

- 25b6dad: Make the favicon configurable from Cosense instead of being silently auto-guessed. New precedence: (1) a `favicon:` entry in `.site` (`code:site.yaml`) — either an `https://` URL or a Cosense page title whose first image is used; (2) the Cosense project's own icon (`GET /api/projects/<project>` `image`) as the Scrapbox-native default; (3) the home page's image; (4) the first published page (title order) with an image. A non-URL `favicon:` string is always read as a page title, so a `javascript:`/`data:` value can never reach the `<link rel="icon">` href. The project-icon lookup is best-effort and never fails the build.

## 0.3.5

### Patch Changes

- 46fa60b: Remove regular-expression denial-of-service (ReDoS) hot spots flagged by code scanning: the tag-only-line check in `normalize` (an exponential `/^(#\S+\s*)+$/`), the slash trim in `normalizeBase` (a quadratic `/^\/+|\/+$/`), and the markdown-link scan in `renderInlineLinks` (a quadratic `/\[([^\]]+)\]\(([^)\s]+)\)/g`, which runs on remote Cosense content). All three are rewritten to linear scans with unchanged behavior.

## 0.3.4

### Patch Changes

- b9dda01: Render `[[name.icon]]` (strongIcon) larger than `[name.icon]`, matching Cosense. The intermediate icon node now carries a `strong` flag, and theme-default sizes strong icons at ~2.5× the normal inline icon. Previously both forms rendered at the same size.
- dd80acb: Render full inline markup inside table cells. The upstream Scrapbox parser only resolves page links (`[Page]`) inside `table:` cells and leaves labeled external links (`[url label]`), decorations (`[* …]`, `[/ …]`), inline code, formulas, and icons as plain text. Core now re-parses each cell's raw text as a line, so cells get the same inline support as body text — matching how Cosense renders them.

## 0.3.3

### Patch Changes

- b64b6d0: Embed fixes: Spotify share links that carry a locale prefix (`open.spotify.com/intl-ja/track/…`) now embed instead of falling back to a plain link. Google Map notation (`[N…,E…,Z… place]`) on its own line now renders as an embedded iframe map (keyless `output=embed`); inline map notation mixed with text stays a link as before.

## 0.3.2

### Patch Changes

- 8e90094: Two notation-fidelity fixes found via the kitchen-sink page: a linked image on its own line (`[url image-url]`) now keeps its link — the standalone-image path dropped it, so the rendered image wasn't clickable (the intermediate image block gained an optional `href`, and PageContent wraps the `<img>` in an `<a>`; the lightbox already ignores linked images). Helpfeel lines (`? hint`) now render with their `?` marker preserved instead of looking like ordinary inline code.

## 0.3.1

### Patch Changes

- 0982ff4: Validate the Cosense API wire format and cache files at the boundary: unexpected response shapes now fail with an actionable "unexpected response shape" message instead of crashing deep inside parsing (e.g. `RangeError: Invalid time value`), corrupt or truncated cache files register as cache misses (refetch) instead of failing every build until manually deleted, and cache writes are atomic (write-then-rename).
- a1b77b0: Match internal page links case-insensitively, like Cosense itself: `[foo]` in a body now resolves to the page titled "Foo", and backlinks accumulate on the target page regardless of how the link was capitalized. Previously such links rendered as broken on the generated site even though they work on Cosense.
- f976209: Make slug collision suffixes deterministic: when two titles map to the same slug (e.g. "Foo Bar" and "Foo_Bar"), the `-2` suffix is now assigned by creation date instead of the list API's updated-desc order, which silently swapped the two pages' public URLs whenever either was edited. Collisions are also reported as pipeline warnings so `doctor` surfaces them.
- 7d7ac4d: Restrict the favicon fallback to published pages and make it deterministic: it previously scanned the raw source list, so a draft/private page's image could leak onto the public site as its favicon, and the pick followed the list API's updated-desc order, changing from build to build.
- 47ab6b2: Make unattended builds resilient to per-page fetch failures: a page deleted between list and fetch (404) is now skipped with a warning instead of failing the whole build, and transient failures (network errors, 5xx after retries) fall back to the stale cached copy as the cache layer always documented. Warnings surface in `data.warnings` and `doctor`. `SiteSource.fetch` may now return `null` and accepts an `onWarn` callback.
- bd053d2: Validate URL schemes in `.site` declarations: `nav[].href` must be http(s)/mailto/tel, a site-relative path, or a fragment (a `javascript:` href passes Astro's attribute escaping untouched), and `redirects` destinations must be slugs or site-relative paths — no open redirects to external sites. `navHref` in theme-utils additionally guards protocol-relative `//host` paths and runs hrefs through `safeHref` as defense in depth.

## 0.3.0

### Minor Changes

- 67e3916: feat(core): warn about keys `site.yaml` silently ignores

  `parseSitePage` now emits a non-fatal warning when a `site.yaml` key is dropped
  or unrecognized, instead of letting the config silently lose a setting. The
  schema's strict nested objects (`home`, `posts`) strip unknown keys, and the
  `.loose()` top level keeps unrecognized ones, so a misindented or misspelled key
  used to vanish with no error — e.g. indenting `nav:` under `home:` left the
  header navigation empty and built successfully.

  The warnings flow through the existing `warnings` / `onProgress` channel (visible
  in `fetch` / `build` output and `doctor`):

  - A top-level key that looks like a misspelling/misplacement of a known key
    (e.g. `navigation` → `nav`) is flagged with a "did you mean …?" hint. Genuinely
    custom sections (`members:`, `profile:`) don't resemble a known key, so the
    plugin passthrough contract is preserved — no false positives.
  - Unknown keys inside `home:` / `posts:` are reported (with a hint to move a
    misplaced block up to the top level).

  Known-key sets are derived from the schema itself, so they can't drift. Behaviour
  for valid configs, YAML syntax errors, and schema-invalid configs is unchanged.

## 0.2.4

### Patch Changes

- 3522a79: fix: reject invalid --concurrency instead of silently fetching zero pages

  A non-numeric `--concurrency` parsed to `NaN`, and `Math.max(1, NaN)` is `NaN`,
  so the fetch loop never advanced and the build silently produced zero pages.
  The CLI now rejects a non-positive-integer `--concurrency` up front, and
  `buildIntermediate` / icon vendoring normalize the value defensively so a bad
  concurrency can never stall the batch loop.

- 3522a79: fix(core): resolve links and vendor icons inside quotes and table cells

  Inline traversal only covered paragraph/heading/list, so a `[Page]` link in a
  blockquote or table cell was left with no slug (rendered broken even when the
  target exists) and a missing target there was invisible to `doctor`; icons in
  table cells were likewise never vendored. A shared block-inline walker
  (`mapBlockInlines` / `forEachBlockInline`) now drives link resolution, icon
  vendoring and the doctor link check uniformly across quote and table blocks.

## 0.2.3

### Patch Changes

- 6286ea9: fix(core): don't surface a YAML code-block line as a page summary

  A page whose body is only a data block — e.g. a `#template/collection` CV or
  publication page that is a single `code:foo.yaml` block plus tags — has no prose
  paragraph, so summary derivation fell through to `descriptions[0]`. Cosense
  returns that as the first code line wrapped in backticks (e.g. `` `education:` ``),
  which then rendered under the page title. The fallback now scans `descriptions`
  for the first real prose line, skipping tag-only and whole-line code-span lines,
  so such pages get no junk summary.

## 0.2.2

### Patch Changes

- 9c703fb: Richer parsing and a per-page OG image, all additive to the v1 schema:

  - Pages now carry an optional `image` (first body image, falling back to the Cosense thumbnail) for use as the OpenGraph/Twitter card image.
  - Inline images mixed with text now parse to a real `image` inline node instead of a literal `[image] <url>` text link.
  - `>` quote lines now parse to a `quote` block (rendered as `<blockquote>`).
  - `N.` numbered lines now parse to an ordered `list` block (`ordered: true`), so themes can emit `<ol>`.

- 3a255f8: Table cells now keep their inline markup. The intermediate `table` block's `rows` changed from `string[][]` (each cell a flattened string) to `InlineNode[][][]` (each cell an `InlineNode[]`), so links, decorations, code and icons inside a `table:` cell survive instead of being collapsed to text — and a page link inside a cell now counts in the link graph. `PageContent` renders each cell through `Inline`.

  Note: this is a breaking change to the v1 intermediate schema's `table.rows` shape. It is intentional pre-1.0 (no external consumers); a theme that read `table.rows` as strings must read cells as `InlineNode[]`.

- 3669423: Embed YouTube videos. A bare (unlabeled) YouTube URL on its own line — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` — now becomes an `embed` block (mirroring Cosense's auto-embed), instead of a plain link. Labeled links (`[url text]`) and inline URLs stay links.

  - core's parser classifies the embed kind (`embedKind`); the `embed` block was already in the schema, so no schema change.
  - theme-utils gains `youtubeEmbedSrc(url)` (extracts the video id, returns a `youtube-nocookie.com` embed URL) and `PageContent` renders a lazy-loaded, privacy-friendly responsive `<iframe>`; URLs it can't parse fall back to a link.
  - theme-default styles the player as a responsive 16:9 box.

  The classifier is structured to extend to more providers (Vimeo, Spotify, …) by adding a host check.

## 0.2.1

### Patch Changes

- bc233b0: Resolve a site favicon from the project's first page, mirroring Cosense (where the top page's icon becomes the project favicon). The pipeline picks the configured home page's image, else the first source-listed page that has one, and exposes it as `site.icon` on the intermediate model. Also adds `vendorImage()` — downloads a single image to a local copy (the Astro integration uses it to vendor the favicon, sidestepping scrapbox.io's cross-origin block). Patch to stay within the `^0.2.0` range consumers declare.

## 0.2.0

### Minor Changes

- a282ee9: Let operators switch the theme-default skin from Cosense — no repo or code edit. theme-default now reads `theme.skin` from the `.site` YAML and applies the matching named skin (`light` / `dark`), so changing the look is just an edit in Cosense that the next build picks up. A `theme.skin` in `.site` takes precedence over a `preset` wired in `astro.config.ts` (the developer default). core's `SiteStructure` gains an optional `theme` section (`{ skin?: string }`, kept loose for future fields).
