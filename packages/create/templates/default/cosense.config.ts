import { defineCosenseSite } from "@cosense-site-kit/core";

export default defineCosenseSite({
  site: {
    title: "__SITE_TITLE__",
    description: "Built with cosense-site-kit",
    baseUrl: "__BASE_URL__",
    lang: "ja",
  },

  source: {
    type: "cosense",
    project: "__PROJECT__",
  },

  publish: {
    default: "none",
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
