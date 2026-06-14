---
"@cosense-site-kit/theme-utils": patch
---

Embed Spotify artist links: the resolver's resource-type list was missing `artist`, so `open.spotify.com/artist/…` (and `/intl-xx/artist/…`) fell back to a plain link instead of the collection-height player.
