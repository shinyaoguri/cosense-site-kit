---
"@cosense-site-kit/core": minor
---

Make the favicon configurable from Cosense instead of being silently auto-guessed. New precedence: (1) a `favicon:` entry in `.site` (`code:site.yaml`) — either an `https://` URL or a Cosense page title whose first image is used; (2) the Cosense project's own icon (`GET /api/projects/<project>` `image`) as the Scrapbox-native default; (3) the home page's image; (4) the first published page (title order) with an image. A non-URL `favicon:` string is always read as a page title, so a `javascript:`/`data:` value can never reach the `<link rel="icon">` href. The project-icon lookup is best-effort and never fails the build.
