import katex from "katex";

// KaTeX SSR for Cosense [$ ...] inline formulas. Cosense's grammar only has
// inline math — there is no [$$ ...] display variant — so this module only
// exposes an inline renderer. Themes that consume the output need to ship
// KaTeX's stylesheet in their Layout (CDN link is fine).
//
// On a parse error we fall through to the raw source so a broken formula
// still shows the author's text instead of failing the build.

export function renderInlineMath(tex: string): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: false,
      strict: "ignore",
      // htmlAndMathml = visible HTML rendering + hidden MathML semantic block
      // for screen readers. The MathML carries the original TeX in <annotation>
      // so copy-paste of the rendered math yields the source.
      output: "htmlAndMathml",
    });
  } catch {
    return escapeHtml(tex);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
