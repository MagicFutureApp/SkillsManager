export const catalogManifestKey = "catalog:all-time:manifest";
export const catalogStatusKey = "catalog:all-time:sync-status";

export const catalogPageKey = (generation: string, page: number): string =>
  `catalog:all-time:${generation}:page:${page}`;
