import { act, render, screen, waitFor, within } from "@testing-library/react";
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

  it("reserves space below the Electron title bar overlay", async () => {
    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    expect(screen.getByTestId("app-titlebar-spacer")).toHaveClass(
      "fixed",
      "left-0",
      "right-0",
      "top-0",
      "h-11"
    );
    expect(screen.getByTestId("app-shell-layout")).toHaveClass("pt-11");
    expect(screen.getByRole("complementary", { name: "主导航" })).toHaveClass(
      "min-h-[calc(100svh-44px)]"
    );
  });

  it("renders the app identity inside the custom title bar", async () => {
    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    const titlebar = screen.getByTestId("app-titlebar-spacer");

    expect(titlebar).toHaveClass("border-b", "pr-[138px]");
    expect(screen.queryByTestId("app-titlebar-border")).not.toBeInTheDocument();
    expect(within(titlebar).getByRole("img", { name: "Skillport" })).toBeInTheDocument();
    expect(within(titlebar).getByText("Skillport")).toBeInTheDocument();
  });

  it("keeps scrolling inside the content area below the title bar", async () => {
    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    expect(screen.getByTestId("app-shell-layout")).toHaveClass("h-svh", "overflow-hidden", "pt-11");
    expect(screen.getByTestId("app-shell-content")).toHaveClass(
      "h-[calc(100svh-44px)]",
      "overflow-y-auto"
    );
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
