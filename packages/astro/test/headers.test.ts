import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSecurityHeaders,
  renderHeadersFile,
  scriptAssetsInlineLimit,
  writeSecurityHeaders,
} from "../src/headers";

const cspOf = (headers: ReadonlyArray<readonly [string, string]>) =>
  headers.find(([name]) => name === "Content-Security-Policy")?.[1] ?? "";

describe("renderHeadersFile", () => {
  const file = renderHeadersFile(buildSecurityHeaders());

  it("applies every header to all paths in Workers' _headers format", () => {
    expect(file.startsWith("/*\n")).toBe(true);
    for (const name of [
      "X-Content-Type-Options: nosniff",
      "Referrer-Policy: strict-origin-when-cross-origin",
      "X-Frame-Options: SAMEORIGIN",
      "Content-Security-Policy: ",
    ]) {
      expect(file).toContain(`\n  ${name}`);
    }
  });
});

describe("buildSecurityHeaders", () => {
  it("allows only same-origin scripts (plus wasm for Pagefind) by default", () => {
    // Injection into a static site lands in the HTML at build time, so inline
    // scripts are never allowed — the build emits none (#205).
    const csp = cspOf(buildSecurityHeaders());
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(csp).not.toContain("unsafe-inline");
    for (const d of ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"]) {
      expect(csp).toContain(d);
    }
    // Style attributes and arbitrary Cosense image hosts stay unrestricted.
    expect(csp).not.toMatch(/default-src|style-src|img-src/);
  });

  it("appends the site's extra script sources", () => {
    const csp = cspOf(
      buildSecurityHeaders({ scriptSrc: ["https://static.cloudflareinsights.com"] }),
    );
    expect(csp).toContain(
      "script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com",
    );
  });

  it("drops only script-src when csp is false", () => {
    const csp = cspOf(buildSecurityHeaders(false));
    expect(csp).not.toContain("script-src");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("rejects sources that would inject another directive or header line", () => {
    for (const bad of ["https://a; script-src *", "https://a\n  X-Evil: 1", "https://a, *", ""]) {
      expect(() => buildSecurityHeaders({ scriptSrc: [bad] })).toThrow(/csp\.scriptSrc/);
    }
  });
});

describe("scriptAssetsInlineLimit", () => {
  it("never inlines scripts and leaves other assets to Vite's default", () => {
    expect(scriptAssetsInlineLimit("assets/Header.astro_astro_type_script.js")).toBe(false);
    expect(scriptAssetsInlineLimit("assets/style.css")).toBeUndefined();
    expect(scriptAssetsInlineLimit("assets/logo.svg")).toBeUndefined();
  });
});

describe("writeSecurityHeaders", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "headers-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("writes _headers into the build output", () => {
    const headers = buildSecurityHeaders();
    expect(writeSecurityHeaders(dir, headers)).toBe("written");
    expect(readFileSync(join(dir, "_headers"), "utf8")).toBe(renderHeadersFile(headers));
  });

  it("keeps a _headers the site shipped from public/", () => {
    writeFileSync(join(dir, "_headers"), "/*\n  X-Custom: 1\n");
    expect(writeSecurityHeaders(dir, buildSecurityHeaders())).toBe("kept");
    expect(readFileSync(join(dir, "_headers"), "utf8")).toBe("/*\n  X-Custom: 1\n");
  });
});
