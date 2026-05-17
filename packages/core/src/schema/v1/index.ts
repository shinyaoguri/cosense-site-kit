export * from "./inline";
export * from "./block";
export * from "./page";

export const SCHEMA_VERSION = "1" as const;
export type SchemaVersion = typeof SCHEMA_VERSION;
