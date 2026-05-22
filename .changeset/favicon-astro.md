---
"@cosense-site-kit/astro": patch
---

Expose the favicon to themes. The `cosense()` integration vendors the first/home page's icon (`site.icon` from the intermediate) into `public/cosense-icons/` and adds it to the `virtual:cosense-site-kit/site` module as `icon`, so themes can render `<link rel="icon">`.
