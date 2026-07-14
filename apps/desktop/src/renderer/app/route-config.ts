export const routeIds = ["providers", "repositories", "skills", "targets", "settings"] as const;

export type AppRouteId = (typeof routeIds)[number];

export const routePathById: Record<AppRouteId, string> = {
  providers: "/providers",
  repositories: "/repositories",
  skills: "/skills",
  targets: "/targets",
  settings: "/settings"
};

export const routeIdByPath: Record<string, AppRouteId> = Object.fromEntries(
  routeIds.map((routeId) => [routePathById[routeId], routeId])
) as Record<string, AppRouteId>;
