---
"@cosense-site-kit/cli": patch
---

fix(cli): install at the workspace root in the generated Cloudflare workflow

In a monorepo the Cloudflare Workers workflow set the job's working-directory to
the site subdirectory but ran `npm install` there with no override, unlike the
Pages workflow which pins the install to `github.workspace`. The generated
Cloudflare workflow now pins `npm install` to the workspace root too, so the
whole npm workspace is installed regardless of subdirectory lockfile state.
