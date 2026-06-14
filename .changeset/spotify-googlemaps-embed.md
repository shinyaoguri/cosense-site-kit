---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
---

Embed fixes: Spotify share links that carry a locale prefix (`open.spotify.com/intl-ja/track/…`) now embed instead of falling back to a plain link. Google Map notation (`[N…,E…,Z… place]`) on its own line now renders as an embedded iframe map (keyless `output=embed`); inline map notation mixed with text stays a link as before.
