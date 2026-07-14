import { createRoute, createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import React from "react";

import { AppShell } from "@/features/shell/app-shell";
import { ProvidersPage } from "@/features/providers/providers-page";
import { RepositoriesPage } from "@/features/repositories/repositories-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { SkillsPage } from "@/features/skills/skills-page";
import { TargetsPage } from "@/features/targets/targets-page";

export const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  )
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/skills" replace />
});

const providersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/providers",
  component: ProvidersPage
});

const repositoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repositories",
  component: RepositoriesPage
});

const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  component: SkillsPage
});

const targetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/targets",
  component: TargetsPage
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  providersRoute,
  repositoriesRoute,
  skillsRoute,
  targetsRoute,
  settingsRoute
]);
