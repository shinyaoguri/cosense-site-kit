---
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

Fix the Spotify embed card height: `height: auto` on the iframe overrode its `height` attribute and collapsed it to the default ~150px, so the card no longer matched the player (empty gap, or compact content in an oversized box). The fixed-height container now gets the player height (152 compact / 352 full) inline and the iframe fills it exactly. Also fixes a stray JSX comment that leaked into the embed `<div>` markup.
