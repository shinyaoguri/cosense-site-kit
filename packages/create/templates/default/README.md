# __PROJECT_NAME__

A site built from a public Cosense project with [cosense-site-kit](https://github.com/...).

## Develop

```bash
npm install
npm run fetch   # pull pages from Cosense into .cosense-cache/
npm run dev     # start Astro dev server at http://localhost:4321
```

## Build

```bash
npm run build
```

## Configure

- Edit `cosense.config.ts` for the data source and publish rules.
- Edit `astro.config.ts` to swap themes or add Astro integrations.
- Publish a page in Cosense by adding `#publish`. Hide a page by adding `#draft`.

## Deploy

This project assumes GitHub Actions handles the cron-driven build and Cloudflare
Workers (or GitHub Pages) hosts the result. Run `npm run validate` to check the
config locally.
