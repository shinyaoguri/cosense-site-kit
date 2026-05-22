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
