import { describe, expect, it } from "vitest";
import { type EmbedProvider, resolveEmbed, youtubeEmbedSrc } from "../src/embeds";

describe("youtubeEmbedSrc", () => {
  it("extracts the id from the common YouTube URL forms", () => {
    const cases: [string, string][] = [
      ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/shorts/abc123XYZ", "abc123XYZ"],
      ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ];
    for (const [url, id] of cases) {
      expect(youtubeEmbedSrc(url)).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
    }
  });

  it("returns undefined for non-YouTube or malformed URLs", () => {
    expect(youtubeEmbedSrc("https://example.com/watch?v=x")).toBeUndefined();
    expect(youtubeEmbedSrc("https://www.youtube.com/")).toBeUndefined();
    expect(youtubeEmbedSrc("not a url")).toBeUndefined();
  });
});

describe("resolveEmbed", () => {
  it("resolves YouTube to a nocookie player with a 16:9 box", () => {
    const info = resolveEmbed("https://youtu.be/dQw4w9WgXcQ");
    expect(info?.provider).toBe("youtube");
    expect(info?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(info?.aspectRatio).toBe("16 / 9");
  });

  it("resolves Vimeo from both URL forms", () => {
    expect(resolveEmbed("https://vimeo.com/123456789")?.src).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(resolveEmbed("https://player.vimeo.com/video/123456789")?.provider).toBe("vimeo");
  });

  it("resolves Spotify with a fixed height by content type", () => {
    const track = resolveEmbed("https://open.spotify.com/track/abc123");
    expect(track?.src).toBe("https://open.spotify.com/embed/track/abc123");
    expect(track?.height).toBe(152);
    expect(resolveEmbed("https://open.spotify.com/playlist/xyz789")?.height).toBe(352);
  });

  it("returns null for unknown providers and bad URLs", () => {
    expect(resolveEmbed("https://example.com/page")).toBeNull();
    expect(resolveEmbed("not a url")).toBeNull();
  });

  it("lets a caller add a provider ahead of the built-ins", () => {
    const codepen: EmbedProvider = {
      name: "codepen",
      resolve(url) {
        return url.hostname === "codepen.io"
          ? { provider: "codepen", src: `${url.href}/embed`, title: "CodePen" }
          : null;
      },
    };
    const info = resolveEmbed("https://codepen.io/x/pen/abc", [codepen]);
    expect(info?.provider).toBe("codepen");
    // built-ins still unmatched without them in the list
    expect(resolveEmbed("https://youtu.be/dQw4w9WgXcQ", [codepen])).toBeNull();
  });
});
