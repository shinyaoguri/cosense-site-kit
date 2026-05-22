# @cosense-site-kit/core

## 0.2.1

### Patch Changes

- bc233b0: Resolve a site favicon from the project's first page, mirroring Cosense (where the top page's icon becomes the project favicon). The pipeline picks the configured home page's image, else the first source-listed page that has one, and exposes it as `site.icon` on the intermediate model. Also adds `vendorImage()` — downloads a single image to a local copy (the Astro integration uses it to vendor the favicon, sidestepping scrapbox.io's cross-origin block). Patch to stay within the `^0.2.0` range consumers declare.

## 0.2.0

### Minor Changes

- a282ee9: Let operators switch the theme-default skin from Cosense — no repo or code edit. theme-default now reads `theme.skin` from the `.site` YAML and applies the matching named skin (`light` / `dark`), so changing the look is just an edit in Cosense that the next build picks up. A `theme.skin` in `.site` takes precedence over a `preset` wired in `astro.config.ts` (the developer default). core's `SiteStructure` gains an optional `theme` section (`{ skin?: string }`, kept loose for future fields).
