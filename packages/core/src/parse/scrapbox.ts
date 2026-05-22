import type { Block as SbBlock, Node as SbNode } from "@progfay/scrapbox-parser";
import { parse as scrapboxParse } from "@progfay/scrapbox-parser";
import type { CosenseBlock } from "../schema/v1/block";
import type { InlineNode } from "../schema/v1/inline";
import { dedupe } from "../util/dedupe";

// Wraps @progfay/scrapbox-parser and converts its AST to the framework's
// intermediate AST. The parser's types are NEVER exposed outside this file.
// If the parser changes shape, only this module needs to follow.

export interface ParsedPage {
  title: string;
  blocks: CosenseBlock[];
  /** All tags (#xxx) used in the body. Order preserved, deduped. */
  tags: string[];
  /** All internal page-link titles. Order preserved, deduped. */
  pageLinks: string[];
  /** Top images encountered (for OGP / thumbnail). */
  images: string[];
}

export function parseScrapboxText(text: string, project: string): ParsedPage {
  const parsed = scrapboxParse(text, { hasTitle: true });

  let title = "";
  const blocks: CosenseBlock[] = [];
  const tags: string[] = [];
  const pageLinks: string[] = [];
  const images: string[] = [];
  const ctx: Context = { project, tags, pageLinks, images };

  for (const block of parsed) {
    switch (block.type) {
      case "title":
        title = block.text;
        break;
      case "codeBlock":
        blocks.push({
          type: "code",
          filename: block.fileName || undefined,
          lang: inferLang(block.fileName),
          value: block.content,
        });
        break;
      case "table":
        blocks.push({
          type: "table",
          filename: block.fileName || undefined,
          rows: block.cells.map((row) => row.map((cell) => renderInlineToText(cell))),
        });
        break;
      case "line":
        appendLineBlock(block, blocks, ctx);
        break;
    }
  }

  return {
    title,
    blocks,
    tags: dedupe(tags),
    pageLinks: dedupe(pageLinks),
    images: dedupe(images),
  };
}

interface Context {
  /** Source Cosense project — used to resolve icon URLs and ambient pageLinks. */
  project: string;
  tags: string[];
  pageLinks: string[];
  images: string[];
}

function appendLineBlock(
  line: Extract<SbBlock, { type: "line" }>,
  out: CosenseBlock[],
  ctx: Context,
): void {
  const nodes = line.nodes;

  // Empty line — skip rather than emitting an empty paragraph.
  if (nodes.length === 0) return;

  // Single-node lines: an image / strongImage on its own line becomes an
  // image block (common Cosense pattern for embedded media).
  if (nodes.length === 1) {
    const only = nodes[0];
    if (only && only.type === "image") {
      ctx.images.push(only.src);
      out.push({ type: "image", url: only.src });
      return;
    }
    if (only && only.type === "strongImage") {
      ctx.images.push(only.src);
      out.push({ type: "image", url: only.src });
      return;
    }
  }

  // A line whose only meaningful content is `[*-N text]` becomes a heading
  // (N>=2). Smaller bold sizes (N=1) stay as strong inside a paragraph.
  const heading = detectHeading(nodes);
  if (heading) {
    out.push({
      type: "heading",
      depth: heading.depth,
      children: heading.children.flatMap((n) => convertInline(n, ctx)),
    });
    return;
  }

  // A `>` quote line becomes a blockquote. The parser wraps the line in a
  // single quote node; render its inner nodes as the quote body.
  if (nodes.length === 1 && nodes[0]?.type === "quote") {
    out.push({
      type: "quote",
      children: nodes[0].nodes.flatMap((n) => convertInline(n, ctx)),
    });
    return;
  }

  // A `N. ` numbered line becomes an ordered list item. The parser emits a
  // single numberList node carrying the line's content. depth = indent + 1 so
  // a top-level (indent 0) numbered line is still list level 1.
  if (nodes.length === 1 && nodes[0]?.type === "numberList") {
    out.push({
      type: "list",
      ordered: true,
      depth: line.indent + 1,
      children: nodes[0].nodes.flatMap((n) => convertInline(n, ctx)),
    });
    return;
  }

  const children = nodes.flatMap((n) => convertInline(n, ctx));
  if (line.indent > 0) {
    out.push({ type: "list", depth: line.indent, children });
  } else {
    out.push({ type: "paragraph", children });
  }
}

function detectHeading(nodes: SbNode[]): { depth: 1 | 2 | 3; children: SbNode[] } | null {
  // Heading = a line that is a single decoration node with at least one `*-N`
  // where N >= 2. (N=1 is just regular bold, not a heading.)
  if (nodes.length !== 1) return null;
  const only = nodes[0];
  if (!only || only.type !== "decoration") return null;
  const asteriskLevels = only.decos
    .filter((d) => d.startsWith("*-"))
    .map((d) => Number(d.slice(2)));
  if (asteriskLevels.length === 0) return null;
  const max = Math.max(...asteriskLevels);
  if (max < 2) return null;
  // Map *-2 → h3, *-3 → h2, *-4+ → h1.
  const depth: 1 | 2 | 3 = max >= 4 ? 1 : max === 3 ? 2 : 3;
  return { depth, children: only.nodes };
}

function convertInline(node: SbNode, ctx: Context): InlineNode[] {
  switch (node.type) {
    case "plain":
    case "blank":
      return [{ type: "text", value: node.text }];

    case "helpfeel":
      // `? hint` lines — render as inline code for now.
      return [{ type: "code", value: node.text }];

    case "code":
      return [{ type: "code", value: node.text }];

    case "formula":
      return [{ type: "formula", value: node.formula }];

    case "hashTag":
      ctx.tags.push(node.href);
      return [{ type: "tag", name: node.href }];

    case "link": {
      if (node.pathType === "absolute") {
        return [
          {
            type: "link",
            href: node.href,
            children: [{ type: "text", value: node.content || node.href }],
          },
        ];
      }
      if (node.pathType === "root") {
        return [
          {
            type: "link",
            href: node.href.startsWith("/") ? `https://scrapbox.io${node.href}` : node.href,
            children: [{ type: "text", value: node.content || node.href }],
          },
        ];
      }
      // relative → internal page link. The page title is in `href`
      // (`content` is empty for `[Page]` notation).
      const title = node.href || node.content;
      ctx.pageLinks.push(title);
      return [{ type: "pageLink", title, exists: true }];
    }

    case "icon":
    case "strongIcon":
      return [resolveIcon(node.path, ctx.project)];

    case "image":
      ctx.images.push(node.src);
      // `link` mirrors `src` when the image isn't wrapped in a link; only keep
      // a distinct href so the renderer wraps the <img> in an <a>.
      return [
        {
          type: "image",
          src: node.src,
          href: node.link && node.link !== node.src ? node.link : undefined,
        },
      ];

    case "strongImage":
      ctx.images.push(node.src);
      return [{ type: "image", src: node.src }];

    case "strong":
      return [
        {
          type: "strong",
          children: node.nodes.flatMap((n) => convertInline(n, ctx)),
        },
      ];

    case "decoration": {
      const inner = node.nodes.flatMap((n) => convertInline(n, ctx));
      let result: InlineNode[] = inner;
      if (node.decos.some((d) => d.startsWith("*-"))) {
        result = [{ type: "strong", children: result }];
      }
      if (node.decos.includes("/")) {
        result = [{ type: "emphasis", children: result }];
      }
      if (node.decos.includes("-")) {
        result = [{ type: "strikethrough", children: result }];
      }
      return result;
    }

    case "quote":
      return node.nodes.flatMap((n) => convertInline(n, ctx));

    case "numberList":
      return node.nodes.flatMap((n) => convertInline(n, ctx));

    case "commandLine":
      return [{ type: "code", value: `${node.symbol} ${node.text}` }];

    case "googleMap":
      return [
        {
          type: "link",
          href: node.url,
          children: [{ type: "text", value: node.place || node.url }],
        },
      ];

    default:
      return [{ type: "text", value: "" }];
  }
}

function renderInlineToText(nodes: SbNode[]): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case "plain":
        case "blank":
        case "helpfeel":
        case "code":
          return n.text;
        case "formula":
          return n.formula;
        case "hashTag":
          return `#${n.href}`;
        case "link":
          return n.content || n.href;
        case "strong":
        case "decoration":
        case "quote":
        case "numberList":
          return renderInlineToText(n.nodes);
        case "icon":
        case "strongIcon":
          return n.path;
        case "image":
        case "strongImage":
          return n.src;
        default:
          return "";
      }
    })
    .join("");
}

function inferLang(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  const ext = filename.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (!ext) return undefined;
  const map: Record<string, string> = {
    ts: "ts",
    tsx: "tsx",
    js: "js",
    jsx: "jsx",
    json: "json",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    sh: "bash",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    html: "html",
    css: "css",
  };
  return map[ext.toLowerCase()] ?? ext.toLowerCase();
}

// `[foo.icon]` (relative) → icon of `foo` in the current project.
// `[/other/foo.icon]` (root) → icon of `foo` in project `other`.
function resolveIcon(path: string, defaultProject: string): InlineNode {
  let project = defaultProject;
  let pageTitle = path;
  if (path.startsWith("/")) {
    const rest = path.slice(1);
    const sep = rest.indexOf("/");
    if (sep > 0) {
      project = rest.slice(0, sep);
      pageTitle = rest.slice(sep + 1);
    } else {
      pageTitle = rest;
    }
  }
  const src = `https://scrapbox.io/api/pages/${encodeURIComponent(project)}/${encodeURIComponent(pageTitle)}/icon`;
  return { type: "icon", pageTitle, project, src };
}
