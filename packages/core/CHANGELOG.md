# @cosense-site-kit/core

## 0.2.0

### Minor Changes

- a282ee9: Let operators switch the theme-default skin from Cosense — no repo or code edit. theme-default now reads `theme.skin` from the `.site` YAML and applies the matching named skin (`light` / `dark`), so changing the look is just an edit in Cosense that the next build picks up. A `theme.skin` in `.site` takes precedence over a `preset` wired in `astro.config.ts` (the developer default). core's `SiteStructure` gains an optional `theme` section (`{ skin?: string }`, kept loose for future fields).
