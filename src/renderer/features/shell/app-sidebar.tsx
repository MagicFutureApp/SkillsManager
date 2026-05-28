import React from "react";

import skillportMark from "../../assets/skillport-mark.svg";
import { Button } from "@/components/ui/button";
import type { AppRouteId } from "@/app/route-config";
import { cn } from "@/lib/utils";
import { shellNavigationGroups } from "./shell-navigation";
import { META } from "@/stores/shell-store";

type AppSidebarProps = {
  activeRouteId: AppRouteId;
  isAutoCollapsed: boolean;
  isCollapsed: boolean;
  onNavigate: (routeId: AppRouteId) => void;
};

export const AppSidebar = ({
  activeRouteId,
  isAutoCollapsed,
  isCollapsed,
  onNavigate
}: AppSidebarProps) => {
  return (
    <aside
      className={cn(
        "flex min-h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,padding]",
        isCollapsed ? "gap-4 px-3 py-4" : "gap-6 px-4 py-5"
      )}
      aria-label="主导航"
      data-auto-collapsed={isAutoCollapsed}
      data-collapsed={isCollapsed}
    >
      <div className={cn("flex min-h-10 items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
        <img src={skillportMark} alt="" className="size-8 rounded-lg" aria-hidden="true" />
        {!isCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{META.title}</p>
            <p className="truncate text-xs text-muted-foreground">{META.description}</p>
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-col", isCollapsed ? "gap-4" : "gap-6")}>
        {shellNavigationGroups.map((group) => (
          <nav key={group.label} className="flex flex-col gap-1" aria-label={group.label}>
            {!isCollapsed ? (
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
            ) : null}
            {group.items
              .filter((item) => !item.hidden)
              .map((item) => {
                const isActive = item.routeId === activeRouteId;
                const Icon = item.icon;

                return (
                  <Button
                    key={item.routeId}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-9 rounded-lg text-sm font-normal",
                      isCollapsed
                        ? "relative size-9 justify-center px-0"
                        : "justify-between px-2.5",
                      isActive && "bg-primary/10 font-semibold text-primary hover:bg-primary/10"
                    )}
                    aria-label={isCollapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onNavigate(item.routeId as AppRouteId)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {isCollapsed ? (
                      <Icon aria-hidden="true" className="size-4" />
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                    <span
                      className={cn(
                        "inline-grid place-items-center rounded-full border border-border bg-background font-mono text-xs tabular-nums text-muted-foreground",
                        isCollapsed
                          ? "absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
                          : "ml-3 h-5 min-w-5 px-1.5",
                        isActive && "text-foreground"
                      )}
                      aria-hidden={isCollapsed ? "true" : undefined}
                    >
                      {item.badge}
                    </span>
                  </Button>
                );
              })}
          </nav>
        ))}
      </div>

      {!isCollapsed ? (
        <div className="mt-auto rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold">计划优先</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            安装前先生成计划预览，确认同步目标和策略后再执行。
          </p>
        </div>
      ) : null}
    </aside>
  );
};
