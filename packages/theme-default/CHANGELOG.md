# @cosense-site-kit/theme-default

## 0.7.2

### Patch Changes

- 83a00bc: Fix `[name.icon]` icons breaking the line mid-sentence: the body-image rule's `display: block` was never overridden for icons, so they rendered on their own line instead of inline with the text like on Cosense.
- Updated dependencies [8e90094]
  - @cosense-site-kit/core@0.3.2
  - @cosense-site-kit/theme-utils@0.4.2

## 0.7.1

### Patch Changes

- b23f95e: Fix XSS: escape `<` in the JSON-LD `<script>` payload so a page title containing `</script>` cannot break out of the script element
- 8d4bc29: Theme fixes: the hover TOC panel now uses theme tokens for its background (it was hardcoded white, unreadable on the dark skin) and opens on keyboard focus (`:focus-within`), tag pages sort newest-first like home and /posts, `/posts` is included in sitemap.xml when a posts tag is configured, and the virtual options type shim gained the missing `search` field.
- Updated dependencies [0982ff4]
- Updated dependencies [a1b77b0]
- Updated dependencies [f976209]
- Updated dependencies [7d7ac4d]
- Updated dependencies [47ab6b2]
- Updated dependencies [bd053d2]
  - @cosense-site-kit/core@0.3.1
  - @cosense-site-kit/theme-utils@0.4.1

## 0.7.0

### Minor Changes

- 4d143ce: Richer default theme interactions and content image handling:

  - **View Transitions** — native cross-document page transitions (soft cross-fade), a persistent sticky header, a title morph between article pages, and a thumbnail → first-image morph from list cards into the page they open. Chromium-only with graceful fallback; respects `prefers-reduced-motion`.
  - **Image lightbox** — clicking a content image opens a full-screen zoom overlay (click or Escape to close). Progressive enhancement; inline icons and linked images are left alone.
  - **Content image sizing** — portrait/tall images are height-capped so they no longer dominate the page, while normal images still fill the content width.
  - Removed the duplicated tag-chip row from the post header (the page's `#tag`s already render inline in the body).

### Patch Changes

- Updated dependencies [4d143ce]
  - @cosense-site-kit/theme-utils@0.4.0

## 0.6.0

### Minor Changes

- 8b1d6a9: feat: hide a page's dates with `#no-date`

  Adds a `#no-date` control tag. A page carrying it renders without its publish and
  update dates — for pages like About where a date isn't meaningful. The dates
  still exist in the data (list ordering, RSS `pubDate`, sitemap `lastmod`); only
  the display is suppressed, both on the page header and in the home/archive list
  cards.

  - `@cosense-site-kit/theme-utils` exports `NO_DATE_TAG` and `hidesDates(tags)`,
    and treats `no-date` as a hidden control tag (no chip, not a browsable
    category) — same family as `#publish`/`#draft`.
  - `@cosense-site-kit/theme-default`'s `page` template and the list meta rows
    honour it.

### Patch Changes

- Updated dependencies [8b1d6a9]
  - @cosense-site-kit/theme-utils@0.3.0

## 0.5.0

### Minor Changes

- 4f75adb: feat(theme-default): keep list cards a stable size when any field overflows

  Tunes the article-list cards (home "Recent", `/posts`, and tag pages) so no
  single oversized field changes a card's footprint:

  - **Summary** now uses up to two lines (was one) before an ellipsis — a longer
    excerpt is allowed, but it can't grow the card without bound.
  - **Title** still clips to a single line with an ellipsis.
  - **Tags** fit to the card width: a new `EntryTags` component renders every
    public tag on one line, and a small client script measures how many fit the
    card's current width, hides the overflow, and labels a `+N` badge with the
    remainder (recomputing on resize and after web fonts load). So the row shows as
    many tags as fit rather than a fixed count. With no JS the row simply clips to
    one line — the card keeps its height either way.

  `EntryTags` replaces the inline tag markup the three list templates duplicated.

## 0.4.1

### Patch Changes

- Updated dependencies [67e3916]
  - @cosense-site-kit/core@0.3.0
  - @cosense-site-kit/theme-utils@0.2.5

## 0.4.0

### Minor Changes

- ed59c88: feat(theme-default): show tags in list views and keep list rows a uniform height

  Article list entries (the home "Recent" section, `/posts`, and tag pages) now
  display each page's public tags as small chips, reusing the same clickable
  `/tags/<tag>` chips as the page header. Control and metadata tags (`#publish`,
  `#published/…`, `#template/…`) stay hidden via `isPublicTag`.

  List rows are also normalised to a single height: the title and the first-line
  summary are each clamped to one line with an ellipsis, and the date sits with
  the tags on a single clipped meta row. A long first line or a page with many
  tags no longer makes its row taller than its neighbours. The global `.summary`
  (site description, profile hero) is intentionally left untruncated.

## 0.3.0

### Minor Changes

- a99e532: feat(theme-default): add a custom 404 page

  The theme now injects a `/404` route, so Astro emits a top-level `dist/404.html`
  that GitHub Pages and Cloudflare Workers Static Assets serve for unknown paths
  (previously visitors hit the host's generic 404). It's a minimal page — a large
  `404`, a short message, and a base-aware link back home — reusing the shared
  header (with its search box). The page carries no `data-pagefind-body`, so it
  stays out of the search index, and it is not listed in the sitemap.

  The Cloudflare deploy generator (`cosense-site deploy init`) now writes
  `assets.not_found_handling: "404-page"` into `wrangler.jsonc` so Workers actually
  serves the page with a real 404 status. Existing Cloudflare sites should re-run
  `cosense-site deploy init --target cloudflare-workers --force` to pick this up;
  GitHub Pages needs no config change.

## 0.2.5

### Patch Changes

- 3522a79: fix(theme-default): tighten pagefind dev-server path containment

  The dev middleware that serves `pagefind/*` checked `file.startsWith(outDir)`,
  which also admits a sibling directory like `<outDir>2`, and let a malformed
  percent-encoding throw out of `decodeURIComponent`. It now decodes defensively
  and requires the resolved path to be the output directory or a separator-bounded
  descendant. Dev-server only; production output is unaffected.

- Updated dependencies [3522a79]
- Updated dependencies [3522a79]
- Updated dependencies [3522a79]
  - @cosense-site-kit/theme-utils@0.2.4
  - @cosense-site-kit/core@0.2.4

## 0.2.4

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

- Updated dependencies [f2652b0]
  - @cosense-site-kit/theme-utils@0.2.3

## 0.2.3

### Patch Changes

- c8274b5: Code blocks now show syntax highlighting (via theme-utils' build-time Shiki) and line numbers. Adds CSS that switches the Shiki palette to the dark set under the dark skin and numbers each line via a CSS counter. The existing language label and copy button still work.
- 9c703fb: Add SEO / social output and discovery endpoints:

  - New routes: `/sitemap.xml` (all pages + home + tag indexes, with `lastmod`), `/robots.txt` (points at the sitemap), and `/feed.xml` (RSS 2.0 of the posts).
  - `Layout` now emits OpenGraph and Twitter Card meta, a canonical link, JSON-LD, and an RSS `<link rel="alternate">` when the site declares a posts tag. Content pages use `og:type=article` and their page image (falling back to the favicon).
  - Inline images get a style so they flow within the text line rather than inheriting the block-image margins.

- 3669423: Embed YouTube videos. A bare (unlabeled) YouTube URL on its own line — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` — now becomes an `embed` block (mirroring Cosense's auto-embed), instead of a plain link. Labeled links (`[url text]`) and inline URLs stay links.

  - core's parser classifies the embed kind (`embedKind`); the `embed` block was already in the schema, so no schema change.
  - theme-utils gains `youtubeEmbedSrc(url)` (extracts the video id, returns a `youtube-nocookie.com` embed URL) and `PageContent` renders a lazy-loaded, privacy-friendly responsive `<iframe>`; URLs it can't parse fall back to a link.
  - theme-default styles the player as a responsive 16:9 box.

  The classifier is structured to extend to more providers (Vimeo, Spotify, …) by adding a host check.

- Updated dependencies [c8274b5]
- Updated dependencies [9c703fb]
- Updated dependencies [9c703fb]
- Updated dependencies [3a255f8]
- Updated dependencies [3669423]
  - @cosense-site-kit/theme-utils@0.2.2
  - @cosense-site-kit/core@0.2.2

## 0.2.2

### Patch Changes

- bc233b0: Render the site favicon. The Layout now emits `<link rel="icon" href={site.icon}>` from `virtual:cosense-site-kit/site` — the icon of the project's first (or home) page, matching Cosense's favicon behavior.
- Updated dependencies [bc233b0]
  - @cosense-site-kit/core@0.2.1

## 0.2.1

### Patch Changes

- 94cf9f5: Fix the published package missing `src/presets/`. `components/Layout.astro` imports `resolveActiveSkin` from `../presets`, but the `files` allowlist enumerated `src/` subdirectories and omitted `presets/`, so `.astro` (shipped raw) couldn't resolve it and any npm consumer building with the theme failed with `Could not resolve "../presets"`. The in-repo docs site uses workspace deps where `presets/` is present locally, so it never surfaced. Now ships the whole `src/` (matching `theme-utils`) so a new source dir can't be left out of the tarball again.
- Updated dependencies [4e845c6]
  - @cosense-site-kit/theme-utils@0.2.1

## 0.2.0

### Minor Changes

- a282ee9: Let operators switch the theme-default skin from Cosense — no repo or code edit. theme-default now reads `theme.skin` from the `.site` YAML and applies the matching named skin (`light` / `dark`), so changing the look is just an edit in Cosense that the next build picks up. A `theme.skin` in `.site` takes precedence over a `preset` wired in `astro.config.ts` (the developer default). core's `SiteStructure` gains an optional `theme` section (`{ skin?: string }`, kept loose for future fields).
- cf7351a: Add preset (skin) support. `themeDefault({ preset })` recolors the theme via CSS design-token overrides with no new templates — skins are data, not packages, so they don't duplicate rendering. Ships `presetDark`. Token overrides inject as an inline `style` on `<html>` (so they beat the `:root` defaults regardless of stylesheet order), `colorScheme`/`data-theme` are set for native UI, and the font `<link>` is now preset-driven via `fontHref`. The sticky-header background is now the `--color-header-bg` token.

### Patch Changes

- 5fe1058: `create-cosense-site --theme` now accepts any published npm theme package, not just featured ids. A theme declares a `cosenseSiteKit` block in its package.json (`{ kind, schemaVersion, skins }`); create reads it via `npm view` and wires `astro.config.ts` + the dependency — no core-repo edit or central registry needed. Featured ids (e.g. `default`) remain as curated shortcuts. theme-default ships this metadata.
- b367a49: Share the theme integration plumbing in theme-utils so every theme — theme-default and third-party alike — sits on the same base instead of copy-pasting it. Adds `pagePaths()` (the `/[...slug]` getStaticPaths boilerplate) and `optionsVirtualModule(id, options)` (the `virtual:<theme>/options` Vite plugin). theme-default now uses both.
- Updated dependencies [a282ee9]
- Updated dependencies [b367a49]
  - @cosense-site-kit/core@0.2.0
  - @cosense-site-kit/theme-utils@0.2.0
