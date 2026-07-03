---
"@cosense-site-kit/cli": patch
---

fix(cli): validate deploy-init inputs and pin action versions in one place

Four hardening fixes to `deploy init` generation:

- Worker names no longer keep a trailing hyphen left by the 63-char cut (wrangler
  rejects it); leading/trailing hyphens are trimmed after truncation.
- `--schedule` is validated as a 5-field cron; a malformed value now fails
  generation instead of producing a workflow that silently never fires.
- `--working-directory` is validated as a plain relative path, so a value with
  spaces/quotes/colons can't emit invalid YAML.
- GitHub Action versions live in one `ACTION_VERSIONS` table (bumped to match
  this repo's own build.yml), with a test asserting they stay in sync with the
  dogfood workflow — so a dependabot bump there can't silently leave the
  generated-for-users workflow behind.
