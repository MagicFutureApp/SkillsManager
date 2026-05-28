import { useLocation, useNavigate } from "@tanstack/react-router";
import { routeIdByPath, routePathById } from "@/app/route-config";
import type { AppHealth } from "@/global";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

import { AppSidebar } from "./app-sidebar";

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
    <div
      className={cn(
        "grid min-h-svh bg-background text-foreground transition-[grid-template-columns]",
        shouldCollapseSidebar ? "grid-cols-[64px_minmax(0,1fr)]" : "grid-cols-[232px_minmax(0,1fr)]"
      )}
    >
      <AppSidebar
        activeRouteId={activeRouteId}
        isAutoCollapsed={isSidebarAutoCollapsed}
        isCollapsed={shouldCollapseSidebar}
        onNavigate={(routeId) => void navigate({ to: routePathById[routeId] })}
      />
      <main className="min-w-0">
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
  );
};
