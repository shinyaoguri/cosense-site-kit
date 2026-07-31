---
"@cosense-site-kit/theme-default": minor
"@cosense-site-kit/theme-utils": minor
"@cosense-site-kit/astro": minor
---

Support Astro 7. `peerDependencies` now accept `^5.0.0 || ^6.0.0 || ^7.0.0`, and the in-repo dev/CI toolchain runs on Astro 7.1.x. Astro 5/6 consumers are unaffected — no source changes were needed for the major bump (build, tests, `astro check`, and `tsc --noEmit` all pass unchanged).
