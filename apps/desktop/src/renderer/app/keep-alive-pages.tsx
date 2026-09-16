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
 * 按需挂载页面并在路由切换后保持挂载：首次访问时渲染，之后只切换可见性，
 * 从而保留页面内的筛选、分页、选中项和滚动位置等局部状态。
 */
export const KeepAlivePages = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeRouteId = getActiveRouteId(pathname);
  const [mountedRouteIds, setMountedRouteIds] = useState<ReadonlySet<AppRouteId>>(
    () => new Set([activeRouteId])
  );

  useEffect(() => {
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
        if (!mountedRouteIds.has(routeId)) {
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
