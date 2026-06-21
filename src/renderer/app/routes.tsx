import { createRoute, createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import React from "react";

import { AppShell } from "@/features/shell/app-shell";
import { ProvidersPage } from "@/features/providers/providers-page";
import { RepositoriesPage } from "@/features/repositories/repositories-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { SkillsPage } from "@/features/skills/skills-page";
import { SyncHistoryPage } from "@/features/sync-history/sync-history-page";
import { TargetsPage } from "@/features/targets/targets-page";

const PagePlaceholder = ({ title, copy }: { title: string; copy: string }) => {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-8 text-card-foreground">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </section>
  );
};

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

const distributionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/distribution",
  component: () => (
    <PagePlaceholder
      title="预览 dry-run 分发计划"
      copy="先确认 commit 锁定、冲突和目标路径，再执行安装或更新。"
    />
  )
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage
});

const syncHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sync-history",
  component: SyncHistoryPage
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  providersRoute,
  repositoriesRoute,
  skillsRoute,
  targetsRoute,
  distributionRoute,
  settingsRoute,
  syncHistoryRoute
]);
