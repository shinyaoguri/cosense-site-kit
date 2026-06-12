import { z } from "zod";
import { withRetry } from "../../util/retry";
import {
  type CosenseListResponse,
  type CosensePageResponse,
  cosenseListResponseSchema,
  cosensePageResponseSchema,
} from "./api-types";

const DEFAULT_BASE = "https://scrapbox.io/api";
const DEFAULT_TIMEOUT_MS = 30_000;
const LIST_PAGE_SIZE = 100;

export interface CosenseApiOptions {
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export class CosenseApi {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(opts: CosenseApiOptions = {}) {
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = opts.userAgent ?? "cosense-site-kit/0.0.0";
  }

  async listPagesPage(
    project: string,
    skip: number,
    signal?: AbortSignal,
  ): Promise<CosenseListResponse> {
    const url = new URL(`${this.baseUrl}/pages/${encodeURIComponent(project)}`);
    url.searchParams.set("limit", String(LIST_PAGE_SIZE));
    url.searchParams.set("skip", String(skip));
    const json = await this.getJson<unknown>(url, signal);
    return validateShape(cosenseListResponseSchema, json, url);
  }

  async *listAllPages(
    project: string,
    signal?: AbortSignal,
  ): AsyncGenerator<CosenseListResponse["pages"][number]> {
    let skip = 0;
    while (true) {
      const res = await this.listPagesPage(project, skip, signal);
      for (const p of res.pages) yield p;
      skip += res.pages.length;
      if (res.pages.length === 0 || skip >= res.count) return;
    }
  }

  async getPage(
    project: string,
    title: string,
    signal?: AbortSignal,
  ): Promise<CosensePageResponse> {
    const url = new URL(
      `${this.baseUrl}/pages/${encodeURIComponent(project)}/${encodeURIComponent(title)}`,
    );
    const json = await this.getJson<unknown>(url, signal);
    return validateShape(cosensePageResponseSchema, json, url);
  }

  private async getJson<T>(url: URL, externalSignal?: AbortSignal): Promise<T> {
    return withRetry(
      async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(new Error("request timed out")), this.timeoutMs);
        const onExternalAbort = () => ctrl.abort(externalSignal?.reason);
        externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
        try {
          const res = await fetch(url, {
            headers: { Accept: "application/json", "User-Agent": this.userAgent },
            signal: ctrl.signal,
          });
          if (!res.ok) {
            throw new CosenseApiError(`${res.status} ${res.statusText} on ${url}`, res.status);
          }
          return (await res.json()) as T;
        } finally {
          clearTimeout(timer);
          externalSignal?.removeEventListener("abort", onExternalAbort);
        }
      },
      {
        signal: externalSignal,
        shouldRetry: (err) => {
          if (err instanceof CosenseApiError) {
            return err.status >= 500 || err.status === 429;
          }
          return true;
        },
      },
    );
  }
}

// Validate the wire shape after a successful response. Retrying won't fix a
// shape mismatch, so this runs outside withRetry and produces an actionable
// message instead of a crash deep inside parsing.
function validateShape<S extends z.ZodType>(schema: S, json: unknown, url: URL): z.infer<S> {
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Cosense API returned an unexpected response shape from ${url}: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export class CosenseApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CosenseApiError";
  }
}
