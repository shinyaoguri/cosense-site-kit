import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderInlineMath, renderMath } from "../src/math";

describe("renderInlineMath", () => {
  it("renders a simple expression as KaTeX HTML", () => {
    const out = renderInlineMath("E = mc^2");
    expect(out).toContain('class="katex"');
    expect(out).toMatch(/<math\b/);
    // TeX source preserved in <annotation> for copy-paste / screen readers.
    expect(out).toContain("E = mc^2");
  });

  it("emits a display-mode-off (inline) wrapper", () => {
    const out = renderInlineMath("x + y");
    // displayMode: false → no .katex-display wrapper.
    expect(out).not.toContain("katex-display");
  });

  it("renders TeX commands rather than leaving them as text", () => {
    const out = renderInlineMath("\\frac{1}{2}");
    expect(out).toContain('class="katex"');
    expect(out).toContain("mfrac");
  });

  it("survives an unparseable formula instead of throwing", () => {
    // throwOnError: false → unknown commands are highlighted in the output,
    // not thrown. The important contract is the build doesn't crash.
    expect(() => renderInlineMath("\\definitelyNotAMacro{x}")).not.toThrow();
  });
});

describe("renderMath display mode", () => {
  it("emits the .katex-display wrapper when display is true", () => {
    expect(renderMath("E = mc^2", true)).toContain("katex-display");
  });

  it("stays inline (no display wrapper) by default", () => {
    expect(renderMath("E = mc^2")).not.toContain("katex-display");
  });
});

describe("KaTeXLink stylesheet", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/components/KaTeXLink.astro"),
    "utf8",
  );

  it("self-hosts the CSS from the installed katex package (version can't drift)", () => {
    expect(source).toContain('import "katex/dist/katex.min.css"');
  });

  it("does not hardcode a pinned CDN katex URL", () => {
    // A hardcoded `katex@<version>` CDN URL drifts from the installed katex on
    // every dependabot bump; the markup and CSS must be the same version.
    expect(source).not.toMatch(/katex@\d+\.\d+\.\d+/);
    expect(source).not.toContain("cdn.jsdelivr.net");
  });
});
