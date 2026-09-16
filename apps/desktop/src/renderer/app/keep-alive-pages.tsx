import { useRouterState } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";

import { ProvidersPage } from "@/features/providers/providers-page";
import { RepositoriesPage } from "@/features/repositories/repositories-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { SkillsPage } from "@/features/skills/skills-page";
import { TargetsPage } from "@/features/targets/targets-page";

import type { AppRouteId } from "./route-config";
import { getActiveRouteId, routeIds } from "./route-config";

const pageComponentById: Record<AppRouteId, React.ComponentType> = {
  providers: ProvidersPage,
  repositories: RepositoriesPage,
  skills: SkillsPage,
  targets: TargetsPage,
  settings: SettingsPage
};

export const getKeepAlivePageTestId = (routeId: AppRouteId) => `keep-alive-page-${routeId}`;

/**
 * Keep-alive 开关。当前为 `false`，即「短路口」：只渲染当前激活页面，切换 Tab 时上一个
 * 页面照常卸载，行为与改造前的 `<Outlet/>` 等价。
 *
 * 这里刻意保留完整架构，只短路最后的复用逻辑：`KeepAlivePages` 仍是 root 的渲染出口、
 * 路由侧改动、`routeIds` 顺序与 `data-testid` 约定都不变，翻回 `true` 即恢复「切换 Tab
 * 保留页面状态」（首次访问才挂载、之后只切 `hidden` 可见性）。两种行为都有测试覆盖，
 * 见 `keep-alive-pages.test.tsx` 中按该常量分流的两个 describe。
 */
export const KEEP_ALIVE_ENABLED = false;

/**
 * 页面渲染出口。`KEEP_ALIVE_ENABLED` 为 `true` 时按需挂载页面并在路由切换后保持挂载：
 * 首次访问时渲染，之后只切换可见性，从而保留页面内的筛选、分页、选中项和滚动位置等
 * 局部状态；为 `false` 时只渲染当前激活页面。
 */
export const KeepAlivePages = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeRouteId = getActiveRouteId(pathname);
  const [mountedRouteIds, setMountedRouteIds] = useState<ReadonlySet<AppRouteId>>(
    () => new Set([activeRouteId])
  );

  useEffect(() => {
    if (!KEEP_ALIVE_ENABLED) {
      return;
    }

    setMountedRouteIds((currentRouteIds) => {
      if (currentRouteIds.has(activeRouteId)) {
        return currentRouteIds;
      }

      return new Set(currentRouteIds).add(activeRouteId);
    });
  }, [activeRouteId]);

  return (
    <>
      {routeIds.map((routeId) => {
        const isRendered = KEEP_ALIVE_ENABLED
          ? mountedRouteIds.has(routeId)
          : routeId === activeRouteId;

        if (!isRendered) {
          return null;
        }

        const Page = pageComponentById[routeId];

        return (
          <div
            key={routeId}
            className="h-full min-h-0"
            data-testid={getKeepAlivePageTestId(routeId)}
            hidden={routeId !== activeRouteId}
          >
            <Page />
          </div>
        );
      })}
    </>
  );
};
