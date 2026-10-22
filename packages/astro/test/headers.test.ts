import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHeadersFile, SECURITY_HEADERS, writeSecurityHeaders } from "../src/headers";

describe("renderHeadersFile", () => {
  const file = renderHeadersFile(SECURITY_HEADERS);

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

  it("keeps the CSP to directives that can't break existing sites", () => {
    // Fetch directives would block inline scripts, Pagefind's wasm, KaTeX style
    // attributes and arbitrary Cosense image hosts; tightening them is tracked
    // separately. Only navigation/embedding directives belong here.
    const csp = /Content-Security-Policy: (.*)/.exec(file)?.[1] ?? "";
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toMatch(/default-src|script-src|style-src|img-src|connect-src/);
  });
});

describe("writeSecurityHeaders", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "headers-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("writes _headers into the build output", () => {
    expect(writeSecurityHeaders(dir)).toBe("written");
    expect(readFileSync(join(dir, "_headers"), "utf8")).toBe(renderHeadersFile(SECURITY_HEADERS));
  });

  it("keeps a _headers the site shipped from public/", () => {
    writeFileSync(join(dir, "_headers"), "/*\n  X-Custom: 1\n");
    expect(writeSecurityHeaders(dir)).toBe("kept");
    expect(readFileSync(join(dir, "_headers"), "utf8")).toBe("/*\n  X-Custom: 1\n");
  });
});
