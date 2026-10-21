import { createHash } from "node:crypto";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
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

// Raster formats only. SVG is deliberately absent: a vendored file is served
// from the site's own origin, and an SVG opened directly runs its <script>
// there. An SVG icon therefore fails to vendor and keeps its remote `src`,
// where <img> / <link rel="icon"> render it without executing anything.
const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

const KNOWN_EXTS = [...new Set(Object.values(CONTENT_TYPE_EXT))];

// Sources are remote input (`.site`'s favicon, page images, icon redirects), so
// bound what one download can cost the build.
const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

// Files written by earlier versions that vendored SVG. Removed so a stale copy
// in a persisted public/ dir stops being deployed.
const LEGACY_SVG = /^[0-9a-f]{16}\.svg$/;

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
  await purgeLegacySvg(opts.dir);

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
    await purgeLegacySvg(opts.dir);
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
    // Only reuse a non-empty file. A build killed mid-write (before this change
    // made writes atomic) could leave a 0-byte icon that would otherwise be
    // reused forever, persisted across CI runs via actions/cache.
    if (await isNonEmptyFile(join(dir, `${hash}.${ext}`))) return `${baseUrl}/${hash}.${ext}`;
  }

  const res = await fetchImage(src, fetchImpl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  const ext = CONTENT_TYPE_EXT[contentType.toLowerCase()];
  if (!ext) throw new Error(`unsupported content-type "${contentType || "none"}"`);
  const bytes = await readCapped(res, MAX_IMAGE_BYTES);
  const name = `${hash}.${ext}`;
  // Write-then-rename (like the page cache) so an interrupted build can't leave
  // a truncated image behind for every later build to reuse.
  const dest = join(dir, name);
  const tmp = `${dest}.tmp-${process.pid}`;
  await writeFile(tmp, bytes);
  await rename(tmp, dest);
  return `${baseUrl}/${name}`;
}

// Fetch with a timeout, following redirects by hand so every hop's target is
// checked before a request is sent to it (redirect: "follow" would already have
// hit an internal host by the time the final URL could be inspected).
async function fetchImage(src: string, fetchImpl: typeof fetch): Promise<Response> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let url = src;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertFetchableUrl(url);
    const res = await fetchImpl(url, { redirect: "manual", signal });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    await res.body?.cancel();
    url = new URL(location, url).href;
  }
  throw new Error(`too many redirects (> ${MAX_REDIRECTS})`);
}

// Reject non-http(s) URLs and hosts that name the build machine or a private
// network by literal address. Hostnames that *resolve* to private addresses
// are not caught here (that needs DNS pinning); this blocks the direct forms.
export function assertFetchableUrl(raw: string): void {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error(`unsupported protocol "${u.protocol}"`);
  }
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host)) {
    throw new Error(`refusing to fetch from local/private host "${host}"`);
  }
}

function isPrivateAddress(host: string): boolean {
  // WHATWG URL parsing has already canonicalized IPv4 (0x7f.1 → 127.0.0.1) and
  // bracketed/compressed IPv6.
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (!host.startsWith("[")) return false;
  const v6 = host.slice(1, -1);
  if (v6 === "::" || v6 === "::1") return true;
  if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)) return true; // unique-local, link-local
  const mapped = v6.match(/^::ffff:(.+)$/);
  if (mapped?.[1]) {
    // ::ffff:7f00:1 (canonical form) or ::ffff:127.0.0.1
    const tail = mapped[1];
    if (tail.includes(".")) return isPrivateAddress(tail);
    const [hi = "0", lo = "0"] = tail.split(":");
    const n = (Number.parseInt(hi, 16) << 16) | Number.parseInt(lo, 16);
    return isPrivateAddress(
      [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."),
    );
  }
  return false;
}

// Read a response body, failing once it exceeds `max` bytes rather than
// buffering an unbounded download.
async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) {
    await res.body?.cancel();
    throw new Error(`image too large (${declared} bytes > ${max})`);
  }
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error(`image too large (> ${max} bytes)`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function purgeLegacySvg(dir: string): Promise<void> {
  for (const name of await readdir(dir)) {
    if (LEGACY_SVG.test(name)) await unlink(join(dir, name)).catch(() => {});
  }
}

async function isNonEmptyFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).size > 0;
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
