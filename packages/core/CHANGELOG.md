# @cosense-site-kit/core

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
