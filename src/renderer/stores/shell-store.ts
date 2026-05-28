import { create } from "zustand";

import type { AppRouteId } from "@/app/route-config";

export const SIDEBAR_EXPAND_WIDTH = 232;
export const SIDEBAR_COLLAPSE_WIDTH = 64;
export const MAIN_MINI_WIDTH = 996;
export const SIDEBAR_AUTO_COLLAPSE_WIDTH = MAIN_MINI_WIDTH + SIDEBAR_EXPAND_WIDTH;

export const META = {
  title: "Skillport",
  description: "Sync and Distribute Skills"
};

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
