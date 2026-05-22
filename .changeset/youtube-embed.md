---
"@cosense-site-kit/core": patch
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
---

Embed YouTube videos. A bare (unlabeled) YouTube URL on its own line — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` — now becomes an `embed` block (mirroring Cosense's auto-embed), instead of a plain link. Labeled links (`[url text]`) and inline URLs stay links.

- core's parser classifies the embed kind (`embedKind`); the `embed` block was already in the schema, so no schema change.
- theme-utils gains `youtubeEmbedSrc(url)` (extracts the video id, returns a `youtube-nocookie.com` embed URL) and `PageContent` renders a lazy-loaded, privacy-friendly responsive `<iframe>`; URLs it can't parse fall back to a link.
- theme-default styles the player as a responsive 16:9 box.

The classifier is structured to extend to more providers (Vimeo, Spotify, …) by adding a host check.
