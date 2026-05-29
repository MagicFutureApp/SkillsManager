import { createRoute, createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import React from "react";

import { AppShell } from "@/features/shell/app-shell";
import { ProvidersPage } from "@/features/providers/providers-page";
import { RepositoriesPage } from "@/features/repositories/repositories-page";
import { SkillsPage } from "@/features/skills/skills-page";

const PagePlaceholder = ({
  eyebrow,
  title,
  copy
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) => {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-8 text-card-foreground">
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h3 className="mt-2 font-semibold">{title}</h3>
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
  component: () => (
    <PagePlaceholder
      eyebrow="Targets"
      title="管理 agent 安装目标"
      copy="配置 Codex、Claude Code、Gemini CLI 和自定义目录的安装边界。"
    />
  )
});

const distributionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/distribution",
  component: () => (
    <PagePlaceholder
      eyebrow="Distribution"
      title="预览 dry-run 分发计划"
      copy="先确认 commit 锁定、冲突和目标路径，再执行安装或更新。"
    />
  )
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <PagePlaceholder
      eyebrow="Settings"
      title="配置本地应用偏好"
      copy="管理扫描策略、目标路径和安全执行边界。"
    />
  )
});

const syncHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sync-history",
  component: () => (
    <PagePlaceholder
      eyebrow="Sync history"
      title="追溯仓库同步与扫描运行"
      copy="查看手动同步运行、commit 变化、扫描步骤和失败原因。"
    />
  )
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
