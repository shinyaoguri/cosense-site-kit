---
"@cosense-site-kit/core": minor
---

feat(core): warn about keys `site.yaml` silently ignores

`parseSitePage` now emits a non-fatal warning when a `site.yaml` key is dropped
or unrecognized, instead of letting the config silently lose a setting. The
schema's strict nested objects (`home`, `posts`) strip unknown keys, and the
`.loose()` top level keeps unrecognized ones, so a misindented or misspelled key
used to vanish with no error — e.g. indenting `nav:` under `home:` left the
header navigation empty and built successfully.

The warnings flow through the existing `warnings` / `onProgress` channel (visible
in `fetch` / `build` output and `doctor`):

- A top-level key that looks like a misspelling/misplacement of a known key
  (e.g. `navigation` → `nav`) is flagged with a "did you mean …?" hint. Genuinely
  custom sections (`members:`, `profile:`) don't resemble a known key, so the
  plugin passthrough contract is preserved — no false positives.
- Unknown keys inside `home:` / `posts:` are reported (with a hint to move a
  misplaced block up to the top level).

Known-key sets are derived from the schema itself, so they can't drift. Behaviour
for valid configs, YAML syntax errors, and schema-invalid configs is unchanged.
