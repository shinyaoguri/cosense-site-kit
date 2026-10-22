import type { AstroConfig } from "astro";

export type ImageRemotePatterns = AstroConfig["image"]["remotePatterns"];

// Cosense content hot-links images from arbitrary hosts (Gyazo, Scrapbox
// uploads, ...), so by default any https host may go through astro:assets. This
// is inert unless a theme renders <Image>; when one does, every image URL a
// Cosense editor writes is fetched by the build machine. Astro concatenates
// array config from integrations and astro.config, so a site can only narrow
// this through the integration option, never by adding its own list.
export function resolveImageRemotePatterns(
  patterns: ImageRemotePatterns | undefined,
): ImageRemotePatterns {
  return patterns ?? [{ protocol: "https" }];
}
