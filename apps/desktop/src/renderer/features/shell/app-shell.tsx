import { useLocation, useNavigate } from "@tanstack/react-router";
import { getActiveRouteId, routePathById } from "@/app/route-config";
import type { AppHealth, AppInfo } from "@/global";
import { useShellStore } from "@/stores/shell-store";
import { useDataStore } from "@/stores/data-store";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import skillsManagerMark from "../../assets/skills-manager-mark.svg";
import { AppSidebar } from "./app-sidebar";
import { APP_META } from "../../../core/app-constants";

type AppShellProps = React.PropsWithChildren;

export const AppShell = ({ children }: AppShellProps) => {
  const badgeCounts = useDataStore((state) => state.badgeCounts);
  const dataStoreStatus = useDataStore((state) => state.status);
  const [health, setHealth] = useState<AppHealth | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [dataLoadErrorDismissed, setDataLoadErrorDismissed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const activeRouteId = getActiveRouteId(location.pathname);
  const isSidebarAutoCollapsed = useShellStore((state) => state.isSidebarAutoCollapsed);
  const setActiveRouteId = useShellStore((state) => state.setActiveRouteId);
  const setSidebarAutoCollapsedByWidth = useShellStore(
    (state) => state.setSidebarAutoCollapsedByWidth
  );
  const shouldCollapseSidebar = isSidebarAutoCollapsed;
  const { t } = useTranslation();
  const isMacOs = health?.platform === "darwin";

  useEffect(() => {
    setActiveRouteId(activeRouteId);
  }, [activeRouteId, setActiveRouteId]);

  useEffect(() => {
    const syncSidebarAutoCollapse = () => {
      setSidebarAutoCollapsedByWidth(window.innerWidth);
    };

    syncSidebarAutoCollapse();
    window.addEventListener("resize", syncSidebarAutoCollapse);

    return () => {
      window.removeEventListener("resize", syncSidebarAutoCollapse);
    };
  }, [setSidebarAutoCollapsedByWidth]);

  useEffect(() => {
    void window.skillsManager?.getHealth().then(setHealth);
    void window.skillsManager?.getInfo().then(setAppInfo);
  }, []);

  useEffect(() => {
    useDataStore.getState().refreshBadgeCounts();
  }, []);

  // 数据加载错误解除（status 离开 error）后，重置错误条的手动关闭状态，下次出错重新展示（R38）。
  useEffect(() => {
    if (dataStoreStatus !== "error") {
      setDataLoadErrorDismissed(false);
    }
  }, [dataStoreStatus]);

  return (
    <>
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex h-11 items-center border-b border-border bg-background",
          isMacOs ? "justify-center px-[138px]" : "pl-4 pr-[138px]"
        )}
        data-testid="app-titlebar-spacer"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img src={skillsManagerMark} alt={APP_META.title} className="size-5 rounded-md" />
          <span className="truncate text-sm font-semibold">{APP_META.title}</span>
        </div>
      </div>
      <div
        className={cn(
          "grid h-svh overflow-hidden bg-background pt-11 text-foreground transition-[grid-template-columns]",
          shouldCollapseSidebar
            ? "grid-cols-[64px_minmax(0,1fr)]"
            : "grid-cols-[232px_minmax(0,1fr)]"
        )}
        data-testid="app-shell-layout"
      >
        <AppSidebar
          activeRouteId={activeRouteId}
          appVersion={appInfo?.version}
          badgeCounts={badgeCounts}
          isAutoCollapsed={isSidebarAutoCollapsed}
          isCollapsed={shouldCollapseSidebar}
          onNavigate={(routeId) => void navigate({ to: routePathById[routeId] })}
        />
        <main
          className="h-[calc(100svh-44px)] min-w-0 overflow-y-auto"
          data-testid="app-shell-content"
        >
          {dataStoreStatus === "error" && !dataLoadErrorDismissed ? (
            <div
              className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
              role="alert"
            >
              <span>{t("shell.dataLoadFailed")}</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-destructive/50 px-2 py-1 text-xs font-medium hover:bg-destructive/20"
                  onClick={() => useDataStore.getState().refresh()}
                >
                  {t("shell.retry")}
                </button>
                <button
                  type="button"
                  aria-label={t("common.close")}
                  className="rounded-md border border-destructive/50 px-2 py-1 text-xs font-medium hover:bg-destructive/20"
                  onClick={() => setDataLoadErrorDismissed(true)}
                >
                  {t("common.close")}
                </button>
              </span>
            </div>
          ) : null}
          {children}
          {health ? (
            <dl className="sr-only">
              <div className="flex gap-1">
                <dt>Node</dt>
                <dd className="text-foreground">{health.node}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Electron</dt>
                <dd className="text-foreground">{health.electron}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Platform</dt>
                <dd className="text-foreground">{health.platform}</dd>
              </div>
            </dl>
          ) : null}
        </main>
      </div>
    </>
  );
};
