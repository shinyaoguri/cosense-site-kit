// Draft preview is a dev-server convenience: excluded pages are surfaced with
// `draft: true` so authors can check them locally. Outside `astro dev` an
// explicit `previewDrafts: true` would publish them, and `doctor` (which runs
// the pipeline without the Astro config) can't see it — so the build refuses
// instead of shipping drafts behind a passing pre-publish check (#153).
export function assertDraftPreviewAllowed(
  previewDrafts: boolean | undefined,
  isDev: boolean,
): void {
  if (previewDrafts === true && !isDev) {
    throw new Error(
      "cosense: previewDrafts is dev-only and would publish excluded (draft) pages in this build. " +
        "Remove `previewDrafts: true` from cosense() / cosenseLoader() — drafts are already shown in `astro dev` by default.",
    );
  }
}
