---
"@cosense-site-kit/theme-default": patch
---

Fix XSS: escape `<` in the JSON-LD `<script>` payload so a page title containing `</script>` cannot break out of the script element
