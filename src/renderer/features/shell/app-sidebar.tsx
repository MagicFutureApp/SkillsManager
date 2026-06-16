import React from "react";
import { useTranslation } from "react-i18next";

import skillportMark from "../../assets/skillport-mark.svg";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppRouteId } from "@/app/route-config";
import { cn } from "@/lib/utils";
import { shellNavigationGroups } from "./shell-navigation";
import { APP_META } from "../../../core/app-constants";

type AppSidebarProps = {
  activeRouteId: AppRouteId;
  appVersion?: string | null;
  isAutoCollapsed: boolean;
  isCollapsed: boolean;
  onNavigate: (routeId: AppRouteId) => void;
};

export const AppSidebar = ({
  activeRouteId,
  appVersion,
  isAutoCollapsed,
  isCollapsed,
  onNavigate
}: AppSidebarProps) => {
  const { t } = useTranslation();
  const activeNavigationItem = shellNavigationGroups
    .flatMap((group) => group.items)
    .find((item) => item.routeId === activeRouteId);
  const activeNavigationDescription = activeNavigationItem?.descriptionKey
    ? t(activeNavigationItem.descriptionKey)
    : appVersion
      ? t("shell.navigationDescriptions.versionLabel", { version: appVersion })
      : null;

  const logoContent = (
    <>
      <img src={skillportMark} alt="" className="size-8 rounded-lg" aria-hidden="true" />
      {!isCollapsed ? (
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{APP_META.title}</p>
          <p className="truncate text-xs text-muted-foreground">{APP_META.description}</p>
        </div>
      ) : null}
    </>
  );

  return (
    <aside
      className={cn(
        "flex min-h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,padding]",
        "min-h-[calc(100svh-44px)]",
        isCollapsed ? "gap-4 px-3 py-4" : "gap-6 px-4 py-5"
      )}
      aria-label={t("shell.navigation.mainNavigation")}
      data-auto-collapsed={isAutoCollapsed}
      data-collapsed={isCollapsed}
    >
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger
            className="flex min-h-10 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={APP_META.title}
          >
            {logoContent}
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="flex flex-col items-start gap-0.5">
            <span className="font-semibold">{APP_META.title}</span>
            <span className="text-background/75">{APP_META.description}</span>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="flex min-h-10 items-center gap-2.5">{logoContent}</div>
      )}

      <div className={cn("flex flex-col", isCollapsed ? "gap-4" : "gap-6")}>
        {shellNavigationGroups.map((group) => (
          <nav key={group.labelKey} className="flex flex-col gap-1" aria-label={t(group.labelKey)}>
            {group.items
              .filter((item) => !item.hidden)
              .map((item) => {
                const isActive = item.routeId === activeRouteId;
                const Icon = item.icon;
                const label = t(item.labelKey);

                const button = (
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-9 rounded-lg text-sm font-normal",
                      isCollapsed
                        ? "relative size-9 justify-center px-0"
                        : "justify-between px-2.5",
                      isActive && "bg-primary/10 font-semibold text-primary hover:bg-primary/10"
                    )}
                    aria-label={isCollapsed ? label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onNavigate(item.routeId as AppRouteId)}
                  >
                    {isCollapsed ? (
                      <Icon aria-hidden="true" />
                    ) : (
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon aria-hidden="true" className="size-4" />
                        <span className="truncate">{label}</span>
                      </span>
                    )}
                  </Button>
                );

                return (
                  <React.Fragment key={item.routeId}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={button} />
                        <TooltipContent side="right" align="center">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      button
                    )}
                  </React.Fragment>
                );
              })}
          </nav>
        ))}
      </div>

      {!isCollapsed ? (
        <div className="mt-auto rounded-lg border border-border bg-muted/40 p-3">
          {activeNavigationDescription ? (
            <p className="text-xs leading-5 text-muted-foreground">{activeNavigationDescription}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
};
