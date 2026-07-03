---
"@cosense-site-kit/core": patch
---

fix(core): correct list boundaries in the Scrapbox parser

Two list-boundary behaviors diverged from how Cosense renders:

- An indented `[** big]` line was promoted to a top-level heading (heading
  detection ran before the indent check), splitting the surrounding list. Heading
  detection is now limited to unindented lines, so a big-bold *list item* stays
  in its list.
- Unordered items used `depth = indent` while ordered items used `depth =
  indent + 1`, so a numbered item nested one level deeper than a bullet sibling
  at the same indent. Unordered now uses `indent + 1` too. buildListTree keys off
  relative depth, so homogeneous lists render identically while mixed
  bullet/numbered siblings now sit at the same level.
