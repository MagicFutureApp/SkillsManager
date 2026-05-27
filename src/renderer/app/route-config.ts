export const routeIds = [
  "providers",
  "repositories",
  "skills",
  "targets",
  "distribution",
  "settings",
  "sync-history"
] as const;

export type AppRouteId = (typeof routeIds)[number];

export const routePathById: Record<AppRouteId, string> = {
  providers: "/providers",
  repositories: "/repositories",
  skills: "/skills",
  targets: "/targets",
  distribution: "/distribution",
  settings: "/settings",
  "sync-history": "/sync-history"
};

export const routeIdByPath: Record<string, AppRouteId> = Object.fromEntries(
  routeIds.map((routeId) => [routePathById[routeId], routeId])
) as Record<string, AppRouteId>;
