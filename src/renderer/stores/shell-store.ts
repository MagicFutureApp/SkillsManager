import { create } from "zustand";

import type { AppRouteId } from "@/app/route-config";

export const SIDEBAR_AUTO_COLLAPSE_WIDTH = 1366;

type ShellStore = {
  activeRouteId: AppRouteId;
  isSidebarAutoCollapsed: boolean;
  isSidebarCollapsed: boolean;
  setActiveRouteId: (routeId: AppRouteId) => void;
  setSidebarAutoCollapsedByWidth: (width: number) => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
};

export const useShellStore = create<ShellStore>((set) => ({
  activeRouteId: "skills",
  isSidebarAutoCollapsed: false,
  isSidebarCollapsed: false,
  setActiveRouteId: (routeId) => set({ activeRouteId: routeId }),
  setSidebarAutoCollapsedByWidth: (width) =>
    set({ isSidebarAutoCollapsed: width < SIDEBAR_AUTO_COLLAPSE_WIDTH }),
  setSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
}));
