import { describe, expect, it } from "vitest";
import { assertDraftPreviewAllowed } from "../src/drafts";

describe("assertDraftPreviewAllowed", () => {
  it("rejects an explicit previewDrafts outside the dev server", () => {
    // The only way drafts reach a production build (#153): doctor can't see it,
    // so the build itself has to refuse.
    expect(() => assertDraftPreviewAllowed(true, false)).toThrow(/previewDrafts/);
  });

  it("allows draft preview in dev, explicit or by default", () => {
    expect(() => assertDraftPreviewAllowed(true, true)).not.toThrow();
    expect(() => assertDraftPreviewAllowed(undefined, true)).not.toThrow();
  });

  it("allows builds that leave drafts off", () => {
    expect(() => assertDraftPreviewAllowed(undefined, false)).not.toThrow();
    expect(() => assertDraftPreviewAllowed(false, false)).not.toThrow();
  });
});
