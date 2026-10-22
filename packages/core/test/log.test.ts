import { describe, expect, it } from "vitest";
import { escapeForLog } from "../src/log";

describe("escapeForLog", () => {
  it("keeps a multi-line value on one line so it can't start a workflow command", () => {
    // GitHub Actions reads `::warning::` etc. only at the start of a log line;
    // a Cosense title or .site YAML error carrying a newline could inject one.
    const out = escapeForLog("bad yaml\n::warning::injected\r\n::error::x");
    expect(out).not.toMatch(/[\r\n]/);
    expect(out).toBe("bad yaml\\n::warning::injected\\r\\n::error::x");
  });

  it("makes terminal control sequences visible instead of interpreting them", () => {
    expect(escapeForLog("\u001b[31mred")).toBe("\\u001b[31mred");
    expect(escapeForLog("a\u0000b\u007fc")).toBe("a\\u0000b\\u007fc");
    // U+009B is a one-byte CSI on some terminals.
    expect(escapeForLog("x\u009b2Jy")).toBe("x\\u009b2Jy");
    // Line/paragraph separators break lines in some viewers.
    expect(escapeForLog("a\u2028b\u2029c")).toBe("a\\u2028b\\u2029c");
  });

  it("leaves ordinary text untouched", () => {
    for (const s of ["日本語のタイトル", "emoji 🎉", "tab\tseparated", "a::b [x] #tag 100%", ""]) {
      expect(escapeForLog(s)).toBe(s);
    }
  });
});
