import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildRedirects, ICON_DIR_NAME, iconVendorDir } from "../src/paths";

describe("iconVendorDir", () => {
  it("derives the icon dir from Astro's configured publicDir", () => {
    // A custom publicDir (or a non-cwd root) must be honoured, not
    // `process.cwd()/public`.
    const publicDir = pathToFileURL(join("/proj", "static", "/"));
    expect(iconVendorDir(publicDir)).toBe(join("/proj", "static", ICON_DIR_NAME));
  });

  it("uses the publicDir path regardless of process.cwd()", () => {
    const publicDir = pathToFileURL(join("/somewhere", "else", "public", "/"));
    expect(fileURLToPath(publicDir).startsWith(join("/somewhere", "else"))).toBe(true);
    expect(iconVendorDir(publicDir)).toBe(join("/somewhere", "else", "public", ICON_DIR_NAME));
  });
});

describe("buildRedirects", () => {
  it("maps sources to route paths and bakes the base into destinations", () => {
    expect(buildRedirects({ old: "new-slug", "blog/2024": "archive" }, "/kit/")).toEqual({
      "/old": "/kit/new-slug",
      "/blog/2024": "/kit/archive",
    });
  });

  it("skips sources with dot or empty segments instead of writing outside dist", () => {
    const skipped: string[] = [];
    const out = buildRedirects(
      { "../../pwned": "x", "a/./b": "x", "a//b": "x", "..\\x": "x", ok: "x" },
      "/",
      (from) => skipped.push(from),
    );
    expect(out).toEqual({ "/ok": "/x" });
    expect(skipped).toEqual(["../../pwned", "a/./b", "a//b", "..\\x"]);
  });
});
