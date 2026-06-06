import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type CosenseBlock, forEachBlockInline, mapBlockInlines } from "../schema/v1/block";
import type { InlineNode } from "../schema/v1/inline";
import type { IntermediateData } from "../schema/v1/page";
import { sanitizeConcurrency } from "../util/concurrency";

// Cosense's `[name.icon]` resolves through scrapbox.io's icon endpoint, which
// responds with `Cross-Origin-Resource-Policy: same-origin`. That header makes
// the browser block the image when it's loaded from the generated site (a
// different origin). The fix is to vendor the icons at build time — download
// each one in Node (no CORP enforcement) and rewrite the node to point at a
// local copy the site serves itself.

export interface VendorIconsOptions {
  /** Directory to write downloaded icon files into. Created if missing. */
  dir: string;
  /**
   * URL path the written files are served from, already including the site
   * `base` (e.g. "/cosense-site-kit/cosense-icons"). Used to build each
   * rewritten `src`.
   */
  baseUrl: string;
  /** Max parallel downloads. Default 8. */
  concurrency?: number;
  /** Injectable fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Called with a human-readable message for each icon that fails to vendor. */
  onWarn?: (message: string) => void;
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

const KNOWN_EXTS = [...new Set(Object.values(CONTENT_TYPE_EXT))];

// Download every distinct icon referenced by `data` and return a copy of the
// data with each icon node's `src` rewritten to its local path. Never throws
// for network/IO problems: a failed icon keeps its original (remote) `src` and
// is reported through `onWarn`.
export async function vendorIcons(
  data: IntermediateData,
  opts: VendorIconsOptions,
): Promise<IntermediateData> {
  const sources = collectIconSrcs(data);
  if (sources.size === 0) return data;

  const fetchImpl = opts.fetchImpl ?? fetch;
  // Same NaN/zero guard as the fetch loop: a bad value would stall the batch
  // loop and silently leave icons un-vendored. See sanitizeConcurrency.
  const concurrency = sanitizeConcurrency(opts.concurrency, 8);
  const baseUrl = opts.baseUrl.replace(/\/$/, "");

  await mkdir(opts.dir, { recursive: true });

  const rewrites = new Map<string, string>();
  const urls = [...sources];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (src) => {
        try {
          const local = await downloadIcon(src, opts.dir, baseUrl, fetchImpl);
          rewrites.set(src, local);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          opts.onWarn?.(`icon vendor failed for ${src}: ${msg}`);
        }
      }),
    );
  }

  if (rewrites.size === 0) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => rewriteBlock(block, rewrites)),
    })),
  };
}

// Vendor a single image URL (e.g. the site favicon) the same way as in-page
// icons: download it in Node and return a local URL the site serves itself,
// sidestepping scrapbox.io's Cross-Origin-Resource-Policy. Returns the original
// `src` (and warns) on failure, so a missing favicon never breaks the build.
export async function vendorImage(
  src: string,
  opts: Omit<VendorIconsOptions, "concurrency">,
): Promise<string> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  try {
    await mkdir(opts.dir, { recursive: true });
    return await downloadIcon(src, opts.dir, baseUrl, fetchImpl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    opts.onWarn?.(`image vendor failed for ${src}: ${msg}`);
    return src;
  }
}

async function downloadIcon(
  src: string,
  dir: string,
  baseUrl: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const hash = createHash("sha256").update(src).digest("hex").slice(0, 16);

  // Reuse a previously downloaded copy. Filenames are deterministic, so a prior
  // build's file is still valid — this keeps the twice-daily rebuild offline
  // for unchanged icons.
  for (const ext of KNOWN_EXTS) {
    if (await exists(join(dir, `${hash}.${ext}`))) return `${baseUrl}/${hash}.${ext}`;
  }

  const res = await fetchImpl(src, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  const ext = CONTENT_TYPE_EXT[contentType.toLowerCase()];
  if (!ext) throw new Error(`unsupported content-type "${contentType || "none"}"`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const name = `${hash}.${ext}`;
  await writeFile(join(dir, name), bytes);
  return `${baseUrl}/${name}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function collectIconSrcs(data: IntermediateData): Set<string> {
  const out = new Set<string>();
  const visit = (node: InlineNode): void => {
    if (node.type === "icon") out.add(node.src);
    else if ("children" in node) for (const child of node.children) visit(child);
  };
  for (const page of data.pages) {
    for (const block of page.blocks) forEachBlockInline(block, visit);
  }
  return out;
}

function rewriteBlock(block: CosenseBlock, rewrites: Map<string, string>): CosenseBlock {
  return mapBlockInlines(block, (n) => rewriteNode(n, rewrites));
}

function rewriteNode(node: InlineNode, rewrites: Map<string, string>): InlineNode {
  if (node.type === "icon") {
    const local = rewrites.get(node.src);
    return local ? { ...node, src: local } : node;
  }
  if ("children" in node) {
    return { ...node, children: node.children.map((n) => rewriteNode(n, rewrites)) };
  }
  return node;
}
