import { describe, expect, it } from "vitest";
import { renderInlineMath } from "../src/math";

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
