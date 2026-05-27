import { describe, expect, it } from "vitest";

import { useShellStore } from "./shell-store";

describe("useShellStore", () => {
  it("tracks the active route id", () => {
    useShellStore.getState().setActiveRouteId("providers");

    expect(useShellStore.getState().activeRouteId).toBe("providers");
  });

  it("tracks manual sidebar collapse state", () => {
    useShellStore.setState({
      isSidebarAutoCollapsed: false,
      isSidebarCollapsed: false
    });

    useShellStore.getState().toggleSidebarCollapsed();

    expect(useShellStore.getState().isSidebarCollapsed).toBe(true);

    useShellStore.getState().setSidebarCollapsed(false);

    expect(useShellStore.getState().isSidebarCollapsed).toBe(false);
  });

  it("marks the sidebar as auto-collapsed below the compact width", () => {
    useShellStore.setState({
      isSidebarAutoCollapsed: false,
      isSidebarCollapsed: false
    });

    useShellStore.getState().setSidebarAutoCollapsedByWidth(1365);

    expect(useShellStore.getState().isSidebarAutoCollapsed).toBe(true);

    useShellStore.getState().setSidebarAutoCollapsedByWidth(1366);

    expect(useShellStore.getState().isSidebarAutoCollapsed).toBe(false);
  });
});
