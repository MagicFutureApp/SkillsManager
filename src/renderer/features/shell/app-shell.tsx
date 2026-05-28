import { useLocation, useNavigate } from "@tanstack/react-router";
import { routeIdByPath, routePathById } from "@/app/route-config";
import type { AppHealth } from "@/global";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

import skillportMark from "../../assets/skillport-mark.svg";
import { AppSidebar } from "./app-sidebar";
import { APP_META } from "../../../core/app-constants";

type AppShellProps = React.PropsWithChildren;

export const AppShell = ({ children }: AppShellProps) => {
  const [health, setHealth] = useState<AppHealth | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeRouteId = routeIdByPath[location.pathname] ?? "skills";
  const isSidebarAutoCollapsed = useShellStore((state) => state.isSidebarAutoCollapsed);
  const setActiveRouteId = useShellStore((state) => state.setActiveRouteId);
  const setSidebarAutoCollapsedByWidth = useShellStore(
    (state) => state.setSidebarAutoCollapsedByWidth
  );
  const shouldCollapseSidebar = isSidebarAutoCollapsed;

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
  }, []);

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-50 flex h-11 items-center border-b border-border bg-background pl-4 pr-[138px]"
        data-testid="app-titlebar-spacer"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img src={skillportMark} alt={APP_META.title} className="size-5 rounded-md" />
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
          isAutoCollapsed={isSidebarAutoCollapsed}
          isCollapsed={shouldCollapseSidebar}
          onNavigate={(routeId) => void navigate({ to: routePathById[routeId] })}
        />
        <main
          className="h-[calc(100svh-44px)] min-w-0 overflow-y-auto"
          data-testid="app-shell-content"
        >
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
