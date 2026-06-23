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
  hidden?: boolean;
  icon: LucideIcon;
};

export type ShellNavigationBadgeCounts = Partial<Record<ShellNavigationItem["routeId"], number>>;

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
        descriptionKey: "shell.navigationDescriptions.providers",
        hidden: true,
        icon: PlugZap
      },
      {
        routeId: "repositories",
        labelKey: "shell.navigation.repositories",
        descriptionKey: "shell.navigationDescriptions.repositories",
        icon: GitBranch
      },
      {
        routeId: "skills",
        labelKey: "shell.navigation.skills",
        descriptionKey: "shell.navigationDescriptions.skills",
        icon: Package
      },
      {
        routeId: "targets",
        labelKey: "shell.navigation.targets",
        descriptionKey: "shell.navigationDescriptions.targets",
        icon: Target
      },
      {
        routeId: "distribution",
        labelKey: "shell.navigation.distribution",
        descriptionKey: "shell.navigationDescriptions.distribution",
        icon: Send
      }
    ]
  },
  {
    labelKey: "shell.navigation.system",
    items: [
      { routeId: "settings", labelKey: "shell.navigation.settings", icon: Settings },
      {
        routeId: "sync-history",
        labelKey: "shell.navigation.syncHistory",
        descriptionKey: "shell.navigationDescriptions.syncHistory",
        icon: History
      },
      {
        routeId: "diagnostics",
        labelKey: "shell.navigation.diagnostics",
        hidden: true,
        icon: MonitorCog
      }
    ]
  }
];
