import { describe, expect, it } from "vitest";
import { renderInlineMath } from "../src/math";

describe("renderInlineMath", () => {
  it("renders a simple expression as KaTeX HTML", () => {
    const out = renderInlineMath("E = mc^2");
    expect(out).toContain('class="katex"');
    // KaTeX emits both an MathML semantic block and HTML rendering.
    expect(out.toLowerCase()).toContain("mathml");
    // The TeX source is preserved in the annotation for accessibility.
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
