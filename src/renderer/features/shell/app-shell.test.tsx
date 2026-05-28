import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { useShellStore } from "@/stores/shell-store";
import { createI18nInstance } from "@/i18n/react-i18n";

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

const renderAppShell = async (children: React.ReactNode) => {
  const i18n = await createI18nInstance("zh-CN");

  return render(<I18nextProvider i18n={i18n}>{children}</I18nextProvider>);
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

    await renderAppShell(
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

    await renderAppShell(
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
