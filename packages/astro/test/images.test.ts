import { describe, expect, it } from "vitest";
import { resolveImageRemotePatterns } from "../src/images";

describe("resolveImageRemotePatterns", () => {
  it("allows any https host by default (content hot-links arbitrary hosts)", () => {
    expect(resolveImageRemotePatterns(undefined)).toEqual([{ protocol: "https" }]);
  });

  it("uses the site's list verbatim, including an empty list to allow none", () => {
    // Astro concatenates array config from integrations and astro.config, so a
    // narrower list in astro.config can't remove ours — this option is the only
    // way to narrow it.
    const narrowed = [{ protocol: "https", hostname: "gyazo.com" }];
    expect(resolveImageRemotePatterns(narrowed)).toEqual(narrowed);
    expect(resolveImageRemotePatterns([])).toEqual([]);
  });
});
