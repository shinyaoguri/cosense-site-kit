---
"@cosense-site-kit/astro": patch
---

fix(astro): vendor icons into Astro's configured publicDir

Icon/favicon vendoring wrote to a hardcoded `process.cwd()/public`, ignoring
Astro's `publicDir`/`root`. With a custom `publicDir` (or when `astro build` runs
from a directory other than the project root), the rewritten `src` pointed at a
directory Astro doesn't serve, 404-ing the images. Both the loader and the
integration now derive the target from `config.publicDir`.
