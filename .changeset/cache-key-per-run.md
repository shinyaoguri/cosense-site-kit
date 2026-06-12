---
"@cosense-site-kit/cli": patch
---

`deploy init`: fix the generated `actions/cache` key — a fixed key is never re-saved after the first exact hit, freezing the Cosense cache at its first-run contents and defeating the differential fetch. The key is now unique per run (`github.run_id`) with a `restore-keys` prefix fallback. Also adds a `concurrency` group to the Cloudflare workflow so cron and manual dispatch never race. Existing sites: re-run `cosense-site deploy init --force` to pick this up.
