import katex from "katex";

// SSR for Cosense [$ ...] formulas. Cosense has no dedicated [$$ ...] display
// syntax, but a formula that is the only thing on its line reads as display
// math — PageContent detects that and calls renderMath(tex, true). Consumers
// must ship KaTeX's stylesheet in their Layout (see <KaTeXLink />).
//
// throwOnError:false guarantees a string return for any input; unrenderable
// formulas come back with the problematic subexpression highlighted rather than
// failing the build.

export function renderMath(tex: string, display = false): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode: display,
    strict: "ignore",
    output: "htmlAndMathml",
  });
}

// Inline rendering ([$ ...] within a line). Kept as a named export for themes
// and the Inline renderer; equivalent to renderMath(tex, false).
export function renderInlineMath(tex: string): string {
  return renderMath(tex, false);
}
