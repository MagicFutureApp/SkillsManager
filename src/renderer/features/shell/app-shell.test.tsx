import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { useShellStore } from "@/stores/shell-store";

import { AppShell } from "./app-shell";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/skills" }),
  useNavigate: () => vi.fn()
}));

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true
  });
};

describe("AppShell", () => {
  beforeEach(() => {
    setViewportWidth(1440);
    useShellStore.setState({
      activeRouteId: "skills",
      isSidebarAutoCollapsed: false
    });
  });

  it("auto-collapses the sidebar when the viewport cannot fit the expanded shell", async () => {
    setViewportWidth(1228);

    render(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(screen.getByRole("complementary", { name: "主导航" })).toHaveAttribute(
        "data-collapsed",
        "true"
      );
    });
  });

  it("updates the auto-collapse state when the viewport crosses the compact threshold", async () => {
    setViewportWidth(1229);

    render(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    expect(screen.getByRole("complementary", { name: "主导航" })).toHaveAttribute(
      "data-collapsed",
      "false"
    );

    act(() => {
      setViewportWidth(1228);
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(screen.getByRole("complementary", { name: "主导航" })).toHaveAttribute(
        "data-collapsed",
        "true"
      );
    });
  });
});
