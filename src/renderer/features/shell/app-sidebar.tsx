import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";

import skillportMark from "../../assets/skillport-mark.svg";
import type { AppRouteId } from "@/app/route-ids";
import { shellNavigationGroups } from "./shell-navigation";

type AppSidebarProps = {
  activeRouteId: AppRouteId;
  onNavigate: (routeId: AppRouteId) => void;
};

export const AppSidebar = ({ activeRouteId, onNavigate }: AppSidebarProps) => {
  return (
    <aside
      className="flex min-h-svh flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground"
      aria-label="主导航"
    >
      <div className="flex min-h-10 items-center gap-2.5">
        <img src={skillportMark} alt="" className="size-8 rounded-lg" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">Skills Manager</p>
          <p className="truncate text-xs text-muted-foreground">Local-first desktop</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {shellNavigationGroups.map((group) => (
          <nav key={group.label} className="flex flex-col gap-1" aria-label={group.label}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
            {group.items
              .filter((item) => !item.hidden)
              .map((item) => {
                const isActive = item.routeId === activeRouteId;

                return (
                  <Button
                    key={item.routeId}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-9 justify-between rounded-lg px-2.5 text-sm font-normal",
                      isActive && "bg-primary/10 font-semibold text-primary hover:bg-primary/10"
                    )}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onNavigate(item.routeId as AppRouteId)}
                  >
                    <span className="truncate">{item.label}</span>
                    <span
                      className={cn(
                        "ml-3 inline-grid h-5 min-w-5 place-items-center rounded-full border border-border bg-background px-1.5 font-mono text-xs tabular-nums text-muted-foreground",
                        isActive && "text-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  </Button>
                );
              })}
          </nav>
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm font-semibold">计划优先</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          安装前先生成计划预览，确认同步目标和策略后再执行。
        </p>
      </div>
    </aside>
  );
};
