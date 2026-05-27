import type { AppRouteId } from "@/app/route-ids";

export type ShellNavigationItem = {
  routeId: AppRouteId | "diagnostics";
  label: string;
  badge: string;
  hidden?: boolean;
};

export type ShellNavigationGroup = {
  label: string;
  items: ShellNavigationItem[];
};

export const shellNavigationGroups: ShellNavigationGroup[] = [
  {
    label: "工作区",
    items: [
      { routeId: "providers", label: "Provider", badge: "6" },
      { routeId: "repositories", label: "Repositories", badge: "5" },
      { routeId: "skills", label: "Skills", badge: "0" },
      { routeId: "targets", label: "Targets", badge: "4" },
      { routeId: "distribution", label: "Distribution", badge: "0" }
    ]
  },
  {
    label: "系统",
    items: [
      { routeId: "settings", label: "Settings", badge: "8" },
      { routeId: "sync-history", label: "Sync history", badge: "4" },
      { routeId: "diagnostics", label: "Diagnostics", badge: "5", hidden: true }
    ]
  }
];
