import { defineCosenseSite } from "@cosense-site-kit/core";

export default defineCosenseSite({
  site: {
    title: "Example Personal Site",
    description: "Demo of cosense-site-kit",
    baseUrl: "https://example.com",
    lang: "ja",
  },
  source: {
    type: "cosense",
    project: "shinyaoguri",
  },
  publish: {
    default: "all",
    includeTags: ["publish"],
    excludeTags: ["draft", "private", "internal"],
  },
  routing: {
    slug: "metadata-or-encoded-title",
  },
  deploy: {
    target: "cloudflare-workers",
    schedule: "17 1,13 * * *",
  },
});
