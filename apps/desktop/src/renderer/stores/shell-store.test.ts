import { describe, expect, it } from "vitest";

import { MAIN_MINI_WIDTH, SIDEBAR_EXPAND_WIDTH, useShellStore } from "./shell-store";

describe("useShellStore", () => {
  it("tracks the active route id", () => {
    useShellStore.getState().setActiveRouteId("providers");

    expect(useShellStore.getState().activeRouteId).toBe("providers");
  });

  it("marks the sidebar as auto-collapsed at or below the expanded shell width", () => {
    useShellStore.setState({
      isSidebarAutoCollapsed: false
    });

    useShellStore.getState().setSidebarAutoCollapsedByWidth(MAIN_MINI_WIDTH + SIDEBAR_EXPAND_WIDTH);

    expect(useShellStore.getState().isSidebarAutoCollapsed).toBe(true);

    useShellStore
      .getState()
      .setSidebarAutoCollapsedByWidth(MAIN_MINI_WIDTH + SIDEBAR_EXPAND_WIDTH + 1);

    expect(useShellStore.getState().isSidebarAutoCollapsed).toBe(false);
  });
});
