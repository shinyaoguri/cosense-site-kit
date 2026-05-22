import { buildRobotsTxt, path } from "@cosense-site-kit/theme-utils";
import type { APIContext } from "astro";

// /robots.txt — allow all, point at the sitemap (absolute URL required there).
export function GET(context: APIContext): Response {
  const base = context.site;
  const sitemapUrl = base ? new URL(path("sitemap.xml"), base).href : undefined;
  return new Response(buildRobotsTxt({ sitemapUrl }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
