// Turn a YouTube URL into an embeddable iframe src. core's parser tags an
// embed block as kind "youtube" with the original URL; the theme calls this to
// get the player URL. Returns undefined when no video id can be extracted, so
// the renderer can fall back to a plain link. Uses youtube-nocookie.com so no
// tracking cookies are set until the viewer presses play.
export function youtubeEmbedSrc(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  let id: string | undefined;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") {
      id = u.searchParams.get("v") ?? undefined;
    } else {
      // /embed/ID, /shorts/ID, /v/ID, /live/ID
      id = u.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?#]+)/)?.[1];
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return undefined;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

// Embed registry. core tags standalone bare URLs as embed blocks (kind hints
// only); the theme resolves a URL to a player here. This is the extension
// point: a theme can pass extra providers to PageContent to support more
// services without any core change. Falls back to a plain link when nothing
// matches.

export interface EmbedInfo {
  /** Provider id, used for the wrapper class (embed-<provider>). */
  provider: string;
  /** iframe src (the player URL). */
  src: string;
  /** Accessible iframe title. */
  title: string;
  /** Responsive box ratio, e.g. "16 / 9". Ignored when `height` is set. */
  aspectRatio?: string;
  /** Fixed pixel height for players that aren't a simple ratio (e.g. Spotify). */
  height?: number;
  /** iframe `allow` attribute. */
  allow?: string;
}

export interface EmbedProvider {
  name: string;
  /** Return an EmbedInfo for a URL this provider handles, else null. */
  resolve(url: URL): EmbedInfo | null;
}

const VIDEO_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

const youtube: EmbedProvider = {
  name: "youtube",
  resolve(url) {
    const src = youtubeEmbedSrc(url.href);
    if (!src) return null;
    return {
      provider: "youtube",
      src,
      title: "YouTube video player",
      aspectRatio: "16 / 9",
      allow: VIDEO_ALLOW,
    };
  },
};

const vimeo: EmbedProvider = {
  name: "vimeo",
  resolve(url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    // vimeo.com/123456789 or player.vimeo.com/video/123456789
    const id = url.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    if (!id) return null;
    return {
      provider: "vimeo",
      src: `https://player.vimeo.com/video/${id}`,
      title: "Vimeo video player",
      aspectRatio: "16 / 9",
      allow: "autoplay; fullscreen; picture-in-picture",
    };
  },
};

const spotify: EmbedProvider = {
  name: "spotify",
  resolve(url) {
    if (url.hostname.toLowerCase().replace(/^www\./, "") !== "open.spotify.com") return null;
    const m = url.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    const [, type, id] = m;
    return {
      provider: "spotify",
      src: `https://open.spotify.com/embed/${type}/${id}`,
      title: "Spotify player",
      // Tracks/episodes use the compact player; collections are taller.
      height: type === "track" || type === "episode" ? 152 : 352,
      allow: "encrypted-media; clipboard-write; fullscreen; picture-in-picture",
    };
  },
};

export const DEFAULT_EMBED_PROVIDERS: EmbedProvider[] = [youtube, vimeo, spotify];

// Resolve a URL to a player via the providers (first match wins). Themes may
// prepend their own providers; pass them ahead of the defaults.
export function resolveEmbed(
  url: string,
  providers: EmbedProvider[] = DEFAULT_EMBED_PROVIDERS,
): EmbedInfo | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  for (const provider of providers) {
    const info = provider.resolve(u);
    if (info) return info;
  }
  return null;
}
