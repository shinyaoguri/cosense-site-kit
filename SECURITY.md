# Security

## Reporting a vulnerability

If you believe you have found a security issue in cosense-site-kit, please report it privately via [GitHub Security Advisories](https://github.com/shinyaoguri/cosense-site-kit/security/advisories) rather than opening a public issue. Public PoC disclosure can wait until a fix is shipped.

## Known advisories in dependencies

The default dependency set — Astro 6, which this repo pins — has a clean
`npm audit` (0 known advisories). The notes below cover advisories you may
still hit if you pin an **older, peer-allowed** Astro (the framework's peer
range is `astro@^5 || ^6`), and how cosense-site-kit is exposed in each case.

### Astro 5 advisories (moderate; fixed in Astro 6)

Both are resolved by Astro 6 — staying on 6.x is the fix. The exposure if you
pin Astro 5:

- **GHSA-j687-52p2-xcff** — XSS in `define:vars` via incomplete `</script>`
  sanitization.
  theme-default uses `define:vars` in exactly one place — `LinkPreview.astro`,
  which injects `endpoint`, a build-time constant derived from the site's own
  `BASE_URL`. It never carries Cosense-author or visitor input, so there is no
  attacker-controlled value through which a `</script>` could be smuggled.
  Exposure is near-zero even on Astro 5; Astro 6 closes the bug entirely.

- **GHSA-xr5h-phrj-8vxv** — Server-island encrypted-parameter replay.
  cosense-site-kit produces fully static output (`output: "static"` by
  default). Server islands are not used.

### esbuild / vite dev-server advisory (moderate; fixed)

- **GHSA-67mh-4wv8-2f99** — any origin can send requests to the dev server
  and read responses.
  This affected `astro dev` only — never production builds (`astro build`),
  GitHub Pages output, or Cloudflare Workers deploys, since the dev server
  isn't running there. It is fixed in esbuild 0.25.x, which the current Vite
  pulls in. If you pin an older toolchain that resolves esbuild < 0.25, avoid
  visiting untrusted sites that might probe `localhost:4321` while `astro dev`
  is running.

## Default security posture

The framework treats its own data sources as trusted:

- **Cosense API** is fetched over HTTPS; responses are validated against
  zod schemas before being persisted or rendered.
- **`cosense.config.ts`** is loaded via `c12`/`jiti`, which executes the
  config file as ESM. Don't run cosense-site-kit against a config you
  haven't reviewed — that's the same trust boundary as any other
  TypeScript build config.
- **No telemetry, no network call beyond the Cosense API** during build.
