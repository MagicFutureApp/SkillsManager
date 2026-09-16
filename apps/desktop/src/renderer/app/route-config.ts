export const routeIds = ["providers", "repositories", "skills", "targets", "settings"] as const;

export type AppRouteId = (typeof routeIds)[number];

export const routePathById = {
  providers: "/providers",
  repositories: "/repositories",
  skills: "/skills",
  targets: "/targets",
  settings: "/settings"
} as const satisfies Record<AppRouteId, string>;

export const routeIdByPath: Record<string, AppRouteId> = Object.fromEntries(
  routeIds.map((routeId) => [routePathById[routeId], routeId])
) as Record<string, AppRouteId>;

export const getActiveRouteId = (pathname: string): AppRouteId => routeIdByPath[pathname] ?? "skills";
