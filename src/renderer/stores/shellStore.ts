import { create } from "zustand";

import type { AppRouteId } from "@/app/routeIds";

type ShellStore = {
  activeRouteId: AppRouteId;
  setActiveRouteId: (routeId: AppRouteId) => void;
};

export const useShellStore = create<ShellStore>((set) => ({
  activeRouteId: "skills",
  setActiveRouteId: (routeId) => set({ activeRouteId: routeId })
}));
