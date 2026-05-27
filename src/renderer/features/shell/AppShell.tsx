import { useLocation, useNavigate } from "@tanstack/react-router";
import { routeIdByPath, routePathById } from "@/app/routeIds";
import type { AppHealth } from "../../global";
import { useShellStore } from "@/stores/shellStore";
import React, { useEffect, useState } from "react";

import { AppSidebar } from "./AppSidebar";

type AppShellProps = React.PropsWithChildren;

export const AppShell = ({ children }: AppShellProps) => {
  const [health, setHealth] = useState<AppHealth | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeRouteId = routeIdByPath[location.pathname] ?? "skills";
  const setActiveRouteId = useShellStore((state) => state.setActiveRouteId);

  useEffect(() => {
    setActiveRouteId(activeRouteId);
  }, [activeRouteId, setActiveRouteId]);

  useEffect(() => {
    void window.skillsManager?.getHealth().then(setHealth);
  }, []);

  return (
    <div className="grid min-h-svh grid-cols-[232px_minmax(0,1fr)] bg-background text-foreground">
      <AppSidebar
        activeRouteId={activeRouteId}
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
