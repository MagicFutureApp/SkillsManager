import { createRootRoute, createRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/features/shell/app-shell";

import { KeepAlivePages } from "./keep-alive-pages";
import type { AppRouteId } from "./route-config";
import { routePathById } from "./route-config";
import React from "react";

export const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <KeepAlivePages />
    </AppShell>
  )
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ replace: true, to: routePathById.recommended });
  }
});

const createPageRoute = <TPath extends string>(path: TPath) => {
  return createRoute({
    getParentRoute: () => rootRoute,
    path
  });
};

const pageRoutes = {
  providers: createPageRoute(routePathById.providers),
  repositories: createPageRoute(routePathById.repositories),
  skills: createPageRoute(routePathById.skills),
  targets: createPageRoute(routePathById.targets),
  recommended: createPageRoute(routePathById.recommended),
  settings: createPageRoute(routePathById.settings)
} satisfies Record<AppRouteId, unknown>;

export const routeTree = rootRoute.addChildren([indexRoute, ...Object.values(pageRoutes)]);
