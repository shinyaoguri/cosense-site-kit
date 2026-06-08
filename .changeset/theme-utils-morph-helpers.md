---
"@cosense-site-kit/theme-utils": minor
---

Add helpers for cross-document View Transition morphs:

- `vtName(slug)` — derives a stable, page-unique `view-transition-name` from a slug (non-ident characters collapsed; non-ASCII slugs pass through).
- `PageContent` gains optional `morphName` / `morphImageUrl` props to apply a `view-transition-name` to the first matching image block, pairing it with a list card thumbnail for a shared-element morph.
