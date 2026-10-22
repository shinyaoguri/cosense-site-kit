// Make remote-derived text (page titles, .site YAML errors, warnings) safe to
// print. A newline would let it start a fresh log line, where GitHub Actions
// executes workflow commands like `::warning::` / `::add-mask::`; ESC and C1
// controls would let it drive the terminal (recolor, clear, spoof output).
// Escaped rather than stripped so the original value stays readable.
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally match C0/DEL/C1 controls to escape them
const LOG_UNSAFE = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F\u2028\u2029]/g;

/** Escape line breaks and control characters so `text` prints as one inert line. */
export function escapeForLog(text: string): string {
  return text.replace(LOG_UNSAFE, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    return `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
  });
}
