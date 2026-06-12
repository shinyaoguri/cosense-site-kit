---
"@cosense-site-kit/core": patch
---

Match internal page links case-insensitively, like Cosense itself: `[foo]` in a body now resolves to the page titled "Foo", and backlinks accumulate on the target page regardless of how the link was capitalized. Previously such links rendered as broken on the generated site even though they work on Cosense.
