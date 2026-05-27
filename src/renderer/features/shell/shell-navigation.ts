import {
  GitBranch,
  History,
  MonitorCog,
  Package,
  PlugZap,
  Send,
  Settings,
  Target
} from "lucide-react";

import type { AppRouteId } from "@/app/route-config";
import type { LucideIcon } from "lucide-react";

export type ShellNavigationItem = {
  routeId: AppRouteId | "diagnostics";
  label: string;
  badge: string;
  hidden?: boolean;
  icon: LucideIcon;
};

export type ShellNavigationGroup = {
  label: string;
  items: ShellNavigationItem[];
};

export const shellNavigationGroups: ShellNavigationGroup[] = [
  {
    label: "工作区",
    items: [
      { routeId: "providers", label: "Provider", badge: "6", icon: PlugZap },
      { routeId: "repositories", label: "Repositories", badge: "5", icon: GitBranch },
      { routeId: "skills", label: "Skills", badge: "0", icon: Package },
      { routeId: "targets", label: "Targets", badge: "4", icon: Target },
      { routeId: "distribution", label: "Distribution", badge: "0", icon: Send }
    ]
  },
  {
    label: "系统",
    items: [
      { routeId: "settings", label: "Settings", badge: "8", icon: Settings },
      { routeId: "sync-history", label: "Sync history", badge: "4", icon: History },
      { routeId: "diagnostics", label: "Diagnostics", badge: "5", hidden: true, icon: MonitorCog }
    ]
  }
];
