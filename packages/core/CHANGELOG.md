# @cosense-site-kit/core

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
