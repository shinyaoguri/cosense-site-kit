# Security

## Reporting a vulnerability

If you believe you have found a security issue in cosense-site-kit, please report it privately via [GitHub Security Advisories](https://github.com/shinyaoguri/cosense-site-kit/security/advisories) rather than opening a public issue. Public PoC disclosure can wait until a fix is shipped.

## Known advisories in dependencies

`npm audit` will surface some moderate-severity advisories in transitive
dependencies. We don't ignore them, but the practical exposure for a
cosense-site-kit site is near-zero. Here's the triage:

### Astro 5 advisories (moderate)

- **GHSA-j687-52p2-xcff** — XSS in `define:vars` via incomplete `</script>`
  sanitization.
  cosense-site-kit does not use `define:vars` anywhere. The shipped
  theme-default uses inline `<script>` blocks bundled by Astro, not
  `define:vars` injection.

- **GHSA-xr5h-phrj-8vxv** — Server-island encrypted-parameter replay.
  cosense-site-kit produces fully static output (`output: "static"` by
  default). Server islands are not used.

A major upgrade to Astro 6 will resolve both. Targeted for a future
breaking release; track [#TODO](https://github.com/shinyaoguri/cosense-site-kit/issues).

### esbuild / vite dev-server advisory (moderate)

- **GHSA-67mh-4wv8-2f99** — any origin can send requests to the dev server
  and read responses.

This affects `astro dev` only. Production builds (`astro build`) are
unaffected because the dev server isn't running. CI builds, GitHub
Pages output, and Cloudflare Workers deploys are not exposed.

When running `astro dev` locally, avoid visiting untrusted sites that
might probe `localhost:4321`. The fix requires bumping to esbuild
0.25.x, which is gated on a major Vite upgrade.

## Default security posture

The framework treats its own data sources as trusted:

- **Cosense API** is fetched over HTTPS; responses are validated against
  zod schemas before being persisted or rendered.
- **`cosense.config.ts`** is loaded via `c12`/`jiti`, which executes the
  config file as ESM. Don't run cosense-site-kit against a config you
  haven't reviewed — that's the same trust boundary as any other
  TypeScript build config.
- **No telemetry, no network call beyond the Cosense API** during build.
