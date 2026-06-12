import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CosenseApi, CosenseApiError } from "../src/source/cosense/api";

// Minimal helpers to build Response objects without bringing in MSW. The
// CosenseApi class only cares about res.ok / res.status / res.statusText /
// res.json().
function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}
function errorResponse(status: number, statusText = "Error"): Response {
  return new Response(null, { status, statusText });
}

describe("CosenseApi", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    fetchSpy.mockReset();
  });
  afterEach(() => {
    fetchSpy.mockReset();
  });

  it("listPagesPage requests the right URL with limit + skip", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ projectName: "p", skip: 0, limit: 100, count: 0, pages: [] }),
    );
    const api = new CosenseApi();
    await api.listPagesPage("my-proj", 0);
    const url = new URL(fetchSpy.mock.calls[0]![0] as URL);
    expect(url.pathname).toBe("/api/pages/my-proj");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("skip")).toBe("0");
  });

  it("listAllPages walks pages until count is exhausted", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          projectName: "p",
          skip: 0,
          limit: 100,
          count: 3,
          pages: [
            { id: "a", title: "A" },
            { id: "b", title: "B" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          projectName: "p",
          skip: 2,
          limit: 100,
          count: 3,
          pages: [{ id: "c", title: "C" }],
        }),
      );
    const api = new CosenseApi();
    const titles: string[] = [];
    for await (const p of api.listAllPages("p")) titles.push(p.title);
    expect(titles).toEqual(["A", "B", "C"]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("listAllPages stops when the API returns an empty page", async () => {
    // Defensive: even if count is wrong, an empty page terminates the loop.
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        projectName: "p",
        skip: 0,
        limit: 100,
        count: 999,
        pages: [],
      }),
    );
    const api = new CosenseApi();
    const out: unknown[] = [];
    for await (const p of api.listAllPages("p")) out.push(p);
    expect(out).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("getPage URL-encodes the title", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ id: "1", title: "Hello World" }));
    const api = new CosenseApi();
    await api.getPage("proj", "Hello World");
    const url = new URL(fetchSpy.mock.calls[0]![0] as URL);
    expect(url.pathname).toBe("/api/pages/proj/Hello%20World");
  });

  it("throws CosenseApiError on 404 without retrying (client error)", async () => {
    fetchSpy.mockResolvedValue(errorResponse(404, "Not Found"));
    const api = new CosenseApi();
    await expect(api.getPage("proj", "missing")).rejects.toBeInstanceOf(CosenseApiError);
    // 404 is a permanent client error — shouldRetry returns false; one call only.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and recovers", async () => {
    fetchSpy
      .mockResolvedValueOnce(errorResponse(503, "Service Unavailable"))
      .mockResolvedValueOnce(
        jsonResponse({ projectName: "p", skip: 0, limit: 100, count: 0, pages: [] }),
      );
    const api = new CosenseApi({ baseUrl: "https://example/api" });
    // Pass a tight retry config indirectly: rely on the default. The first
    // call fails (5xx → retry), the second succeeds.
    const res = await api.listPagesPage("p", 0);
    expect(res.count).toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries on 429", async () => {
    fetchSpy
      .mockResolvedValueOnce(errorResponse(429, "Too Many Requests"))
      .mockResolvedValueOnce(
        jsonResponse({ projectName: "p", skip: 0, limit: 100, count: 0, pages: [] }),
      );
    const api = new CosenseApi();
    await api.listPagesPage("p", 0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("propagates external abort", async () => {
    const ctrl = new AbortController();
    fetchSpy.mockImplementation(async (_url, init) => {
      // Mimic real fetch: throw when its signal aborts. Use the init signal
      // (which is the merged signal from CosenseApi's getJson).
      await new Promise<never>((_, reject) => {
        (init?.signal as AbortSignal).addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
      return jsonResponse({});
    });
    setTimeout(() => ctrl.abort(new Error("user cancelled")), 5);
    await expect(api2().listPagesPage("p", 0, ctrl.signal)).rejects.toBeDefined();
  });

  function api2() {
    return new CosenseApi();
  }

  it("uses the configured baseUrl", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ projectName: "p", skip: 0, limit: 100, count: 0, pages: [] }),
    );
    const api = new CosenseApi({ baseUrl: "https://custom.example/api" });
    await api.listPagesPage("p", 0);
    const url = new URL(fetchSpy.mock.calls[0]![0] as URL);
    expect(url.origin).toBe("https://custom.example");
  });
});
