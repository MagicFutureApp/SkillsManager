import type { CatalogSnapshot } from "./types";

export const catalogFreshnessMs = 6 * 60 * 60 * 1_000;

export const isCatalogFresh = (snapshot: CatalogSnapshot, now: Date): boolean => {
  const generatedAt = Date.parse(snapshot.generatedAt);
  return Number.isFinite(generatedAt) && generatedAt + catalogFreshnessMs > now.getTime();
};
