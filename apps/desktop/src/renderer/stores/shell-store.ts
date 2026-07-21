import { create } from "zustand";

import type { AppRouteId } from "@/app/route-config";
export {
  MAIN_MINI_WIDTH,
  SIDEBAR_AUTO_COLLAPSE_WIDTH,
  SIDEBAR_COLLAPSE_WIDTH,
  SIDEBAR_EXPAND_WIDTH
} from "../../core/app-constants";
import { SIDEBAR_AUTO_COLLAPSE_WIDTH } from "../../core/app-constants";

type ShellStore = {
  activeRouteId: AppRouteId;
  isSidebarAutoCollapsed: boolean;
  setActiveRouteId: (routeId: AppRouteId) => void;
  setSidebarAutoCollapsedByWidth: (width: number) => void;
};

export const useShellStore = create<ShellStore>((set) => ({
  activeRouteId: "skills",
  isSidebarAutoCollapsed: false,
  setActiveRouteId: (routeId) => set({ activeRouteId: routeId }),
  setSidebarAutoCollapsedByWidth: (width) =>
    set({ isSidebarAutoCollapsed: width <= SIDEBAR_AUTO_COLLAPSE_WIDTH })
}));
