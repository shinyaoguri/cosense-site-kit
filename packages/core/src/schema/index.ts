// Re-export the latest schema version. Themes and downstream consumers should
// import from "@cosense-site-kit/core/schema". When the schema version is
// bumped, swap this re-export and provide a migration helper alongside the old
// version.
export * from "./v1";
