import { defineCosenseSite } from "@cosense-site-kit/core";

export default defineCosenseSite({
  site: {
    title: "cosense-site-kit",
    description:
      "Cosense（旧Scrapbox）の公開プロジェクトから静的サイトを生成する小さなSSGフレームワーク",
    baseUrl: "https://shinyaoguri.github.io",
    base: "/cosense-site-kit",
    lang: "ja",
  },

  source: {
    type: "cosense",
    project: "cosense-site-kit",
  },

  publish: {
    default: "none",
    includeTags: ["publish"],
    excludeTags: ["draft", "private", "internal"],
  },

  routing: {
    slug: "metadata-or-encoded-title",
  },

  siteConfig: {
    page: ".site",
  },

  deploy: {
    target: "github-pages",
    schedule: "17 1,13 * * *",
  },
});
