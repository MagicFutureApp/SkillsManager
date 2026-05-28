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
  labelKey: string;
  descriptionKey?: string;
  badge: string;
  hidden?: boolean;
  icon: LucideIcon;
};

export type ShellNavigationGroup = {
  labelKey: string;
  items: ShellNavigationItem[];
};

export const shellNavigationGroups: ShellNavigationGroup[] = [
  {
    labelKey: "shell.navigation.workspace",
    items: [
      {
        routeId: "providers",
        labelKey: "shell.navigation.providers",
        badge: "6",
        hidden: true,
        icon: PlugZap
      },
      {
        routeId: "repositories",
        labelKey: "shell.navigation.repositories",
        descriptionKey: "shell.navigationDescriptions.repositories",
        badge: "5",
        icon: GitBranch
      },
      {
        routeId: "skills",
        labelKey: "shell.navigation.skills",
        descriptionKey: "shell.navigationDescriptions.skills",
        badge: "0",
        icon: Package
      },
      {
        routeId: "targets",
        labelKey: "shell.navigation.targets",
        descriptionKey: "shell.navigationDescriptions.targets",
        badge: "4",
        icon: Target
      },
      {
        routeId: "distribution",
        labelKey: "shell.navigation.distribution",
        descriptionKey: "shell.navigationDescriptions.distribution",
        badge: "0",
        icon: Send
      }
    ]
  },
  {
    labelKey: "shell.navigation.system",
    items: [
      { routeId: "settings", labelKey: "shell.navigation.settings", badge: "8", icon: Settings },
      {
        routeId: "sync-history",
        labelKey: "shell.navigation.syncHistory",
        badge: "4",
        hidden: true,
        icon: History
      },
      {
        routeId: "diagnostics",
        labelKey: "shell.navigation.diagnostics",
        badge: "5",
        hidden: true,
        icon: MonitorCog
      }
    ]
  }
];
