import katex from "katex";

// SSR for Cosense [$ ...] inline formulas. Cosense has no [$$ ...] display
// variant, so this module is inline-only. Consumers need to ship KaTeX's
// stylesheet in their Layout — see <KaTeXLink /> in theme-utils/components.
//
// throwOnError:false guarantees a string return for any input; unrenderable
// formulas come back with their problematic subexpression highlighted rather
// than failing the build.

export function renderInlineMath(tex: string): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode: false,
    strict: "ignore",
    output: "htmlAndMathml",
  });
}
