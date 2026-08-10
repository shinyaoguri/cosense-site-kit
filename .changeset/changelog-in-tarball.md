---
"@cosense-site-kit/core": patch
"@cosense-site-kit/astro": patch
"@cosense-site-kit/theme-utils": patch
"@cosense-site-kit/theme-default": patch
"@cosense-site-kit/cli": patch
---

`CHANGELOG.md` を npm の `files` に含めるようにした。これまで tarball に同梱されておらず、`npm view` やオフラインでは消費側がバージョン間の変更点を追えなかった。
