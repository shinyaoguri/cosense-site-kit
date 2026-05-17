# cosense-site-kit

A small SSG framework that turns a public [Cosense](https://scrapbox.io) (formerly Scrapbox) project into a static site — personal pages, lab sites, project sites, course sites.

> Status: WIP. MVP under construction.

## Design

- **Isolate the Cosense API dependency.** All Cosense knowledge lives inside `@cosense-site-kit/core`. Themes and Astro consume only a stable intermediate model.
- **Stable intermediate JSON / AST** is the framework's real public API. It is versioned (`schemaVersion`) so the Cosense parser can change without breaking themes.
- **Separation of fetch and render.** CI fetches and builds; the deployment target (Cloudflare Workers Static Assets / GitHub Pages) only serves.
- **Separation of theme and data transform.** Themes are Astro Integrations; they receive normalized data.
- **Explicit publish control.** Only pages with `#publish` are published by default.

## Packages

| Package | Role |
|---|---|
| `@cosense-site-kit/core` | Cosense fetch, parse, normalize, schema, pipeline, doctor |
| `@cosense-site-kit/astro` | Astro Content Loader + Integration |
| `@cosense-site-kit/theme-default` | Default theme |
| `@cosense-site-kit/cli` | `cosense-site` CLI |
| `create-cosense-site` | Project scaffolder |
| `@cosense-site-kit/deploy` | GitHub Actions / wrangler / Pages config generators |

## License

MIT
