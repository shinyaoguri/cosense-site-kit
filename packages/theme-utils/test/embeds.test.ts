import { describe, expect, it } from "vitest";
import { youtubeEmbedSrc } from "../src/embeds";

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
