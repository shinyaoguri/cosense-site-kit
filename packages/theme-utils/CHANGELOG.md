# @cosense-site-kit/theme-utils

## 0.2.4

### Patch Changes

- 3522a79: fix(theme-utils): drop unsafe schemes from collection citation URLs

  A citation item's `url` flowed straight into an `<a href>` without the
  scheme allow-list that inline markdown links already pass through, so a
  `javascript:`/`data:` URL would render as a live link. `parseCollection` now
  sanitizes citation URLs at parse time via a shared `safeHref` helper (also
  exported), and the template renders plain text when the URL is dropped.

- Updated dependencies [3522a79]
- Updated dependencies [3522a79]
  - @cosense-site-kit/core@0.2.4

## 0.2.3

### Patch Changes

- f2652b0: Add a generic, data-driven `collection` page template.

  theme-default registers a new `collection` template (opt in with
  `#template/collection`, or a `.site` `templates:` mapping). It renders the first
  YAML code block on a page as a set of list sections — suitable for a CV,
  publication list, works/portfolio index, link list, and so on. Each item renders
  from whichever fields it carries (`label`/`period`/`term`/`date`/`year`, `title`,
  `authors`/`source`, `description`, `url`); a section automatically grows "All + tag"
  filter chips when its items carry `tags` (or any boolean-true field). Section
  headings come from the YAML keys, in document order.

  theme-utils gains the pure, tested helpers `parseCollection` and
  `renderInlineLinks` (and a `yaml` dependency).

## 0.2.2

### Patch Changes

- c8274b5: `PageContent` highlights code blocks at build time with Astro's bundled Shiki (dual light/dark theme) instead of emitting a plain `<pre><code>`. Unknown languages fall back to `plaintext` so the build never fails on an exotic extension, and the inferred language is kept on the `<pre>` as `data-language`. Every theme now gets syntax-highlighted code; per-skin colors and line numbers stay the theme's CSS to style.
- 9c703fb: Add shared SEO builders and fix list/quote/image rendering:

  - New dependency-free builders any theme can use to serve discovery endpoints: `buildSitemap`, `buildRssFeed`, `buildRobotsTxt`, and the `escapeXml` helper they share.
  - New `buildListTree` plus a recursive `ListTree.astro` component: consecutive list blocks are folded into one properly nested `<ul>`/`<ol>` (with `<ol>` for ordered lists) instead of a separate single-item `<ul>` per line.
  - `PageContent` now groups consecutive quote lines into one `<blockquote>` and renders inline images as `<img>` (via `Inline`), matching core's richer parser output.

- 3a255f8: Table cells now keep their inline markup. The intermediate `table` block's `rows` changed from `string[][]` (each cell a flattened string) to `InlineNode[][][]` (each cell an `InlineNode[]`), so links, decorations, code and icons inside a `table:` cell survive instead of being collapsed to text — and a page link inside a cell now counts in the link graph. `PageContent` renders each cell through `Inline`.

  Note: this is a breaking change to the v1 intermediate schema's `table.rows` shape. It is intentional pre-1.0 (no external consumers); a theme that read `table.rows` as strings must read cells as `InlineNode[]`.

- 3669423: Embed YouTube videos. A bare (unlabeled) YouTube URL on its own line — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` — now becomes an `embed` block (mirroring Cosense's auto-embed), instead of a plain link. Labeled links (`[url text]`) and inline URLs stay links.

  - core's parser classifies the embed kind (`embedKind`); the `embed` block was already in the schema, so no schema change.
  - theme-utils gains `youtubeEmbedSrc(url)` (extracts the video id, returns a `youtube-nocookie.com` embed URL) and `PageContent` renders a lazy-loaded, privacy-friendly responsive `<iframe>`; URLs it can't parse fall back to a link.
  - theme-default styles the player as a responsive 16:9 box.

  The classifier is structured to extend to more providers (Vimeo, Spotify, …) by adding a host check.

- Updated dependencies [9c703fb]
- Updated dependencies [3a255f8]
- Updated dependencies [3669423]
  - @cosense-site-kit/core@0.2.2

## 0.2.1

### Patch Changes

- 4e845c6: Add `formatDate(iso)` (YYYY-MM-DD, UTC) to the public API. theme-default's home/archive/page templates now import it, so theme-utils must be republished alongside theme-default@0.2.1 — otherwise the published theme-default builds against a theme-utils that doesn't export `formatDate`. Versioned as a patch so it stays within the `^0.2.0` range every consumer (and theme-default) already declares.

## 0.2.0

### Minor Changes

- b367a49: Share the theme integration plumbing in theme-utils so every theme — theme-default and third-party alike — sits on the same base instead of copy-pasting it. Adds `pagePaths()` (the `/[...slug]` getStaticPaths boilerplate) and `optionsVirtualModule(id, options)` (the `virtual:<theme>/options` Vite plugin). theme-default now uses both.

### Patch Changes

- Updated dependencies [a282ee9]
  - @cosense-site-kit/core@0.2.0
