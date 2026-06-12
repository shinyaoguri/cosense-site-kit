---
"@cosense-site-kit/astro": patch
---

Stop clearing the content store on every load: `cosenseLoader` now diffs against the persisted store (set with digest, delete vanished pages), so Astro's Content Layer incremental updates actually take effect instead of every page being marked changed on every build.
