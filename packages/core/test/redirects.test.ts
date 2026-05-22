import { describe, expect, it } from "vitest";
import {
  computeRenameRedirects,
  emptyRedirectStore,
  type RedirectStore,
} from "../src/resolve/redirects";

const page = (id: string, slug: string) => ({ id, slug });

describe("computeRenameRedirects", () => {
  it("records no redirects on the first build, just the slug snapshot", () => {
    const out = computeRenameRedirects(emptyRedirectStore(), [page("1", "a"), page("2", "b")]);
    expect(out.redirects).toEqual({});
    expect(out.slugs).toEqual({ "1": "a", "2": "b" });
  });

  it("emits old → new when a page's slug changes", () => {
    const prev: RedirectStore = { slugs: { "1": "old" }, redirects: {} };
    const out = computeRenameRedirects(prev, [page("1", "new")]);
    expect(out.redirects).toEqual({ old: "new" });
    expect(out.slugs).toEqual({ "1": "new" });
  });

  it("collapses a double rename into a single hop", () => {
    // Build 1→2 produced {a: b}; now the same page renames b → c.
    const prev: RedirectStore = { slugs: { "1": "b" }, redirects: { a: "b" } };
    const out = computeRenameRedirects(prev, [page("1", "c")]);
    expect(out.redirects).toEqual({ a: "c", b: "c" });
  });

  it("drops a redirect when a new page reclaims the old slug", () => {
    const prev: RedirectStore = { slugs: { "1": "x" }, redirects: {} };
    // page 1 moved x → y, and page 2 now lives at x.
    const out = computeRenameRedirects(prev, [page("1", "y"), page("2", "x")]);
    expect(out.redirects).toEqual({});
  });

  it("drops a redirect whose destination no longer exists (deleted page)", () => {
    const prev: RedirectStore = { slugs: { "1": "gone" }, redirects: { older: "gone" } };
    // page 1 is absent now (deleted); nothing points anywhere live.
    const out = computeRenameRedirects(prev, [page("2", "other")]);
    expect(out.redirects).toEqual({});
    expect(out.slugs).toEqual({ "2": "other" });
  });

  it("keeps redirects across an unrelated rebuild", () => {
    const prev: RedirectStore = { slugs: { "1": "a", "2": "b" }, redirects: { legacy: "a" } };
    const out = computeRenameRedirects(prev, [page("1", "a"), page("2", "b")]);
    expect(out.redirects).toEqual({ legacy: "a" });
  });

  it("never keeps a self-redirect", () => {
    const prev: RedirectStore = { slugs: { "1": "a" }, redirects: { a: "a" } };
    const out = computeRenameRedirects(prev, [page("1", "a")]);
    expect(out.redirects).toEqual({});
  });
});
