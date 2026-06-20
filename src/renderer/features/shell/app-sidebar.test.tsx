import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { AppSidebar } from "./app-sidebar";
import { shellNavigationGroups } from "./shell-navigation";
import { createI18nInstance } from "@/i18n/react-i18n";

const renderSidebar = async (props: Partial<React.ComponentProps<typeof AppSidebar>> = {}) => {
  const i18n = await createI18nInstance("zh-CN");

  return render(
    <I18nextProvider i18n={i18n}>
      <AppSidebar
        activeRouteId="skills"
        appVersion="0.1.0"
        isAutoCollapsed={false}
        isCollapsed={false}
        onNavigate={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
};

describe("AppSidebar", () => {
  it("hides Providers from the visible sidebar navigation", async () => {
    await renderSidebar();

    expect(screen.queryByRole("button", { name: /Provider/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("keeps diagnostics hidden from the visible sidebar navigation", async () => {
    await renderSidebar();

    expect(screen.queryByRole("button", { name: /Diagnostics/i })).not.toBeInTheDocument();
  });

  it("does not render a manual sidebar collapse toggle", async () => {
    await renderSidebar();

    expect(screen.queryByRole("button", { name: "收起侧边栏" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展开侧边栏" })).not.toBeInTheDocument();
  });

  it("uses compact navigation when the sidebar is collapsed", async () => {
    await renderSidebar({ isCollapsed: true });

    expect(screen.getByRole("complementary", { name: "主导航" })).toHaveAttribute(
      "data-collapsed",
      "true"
    );
    expect(screen.queryByText("Local-first desktop")).not.toBeInTheDocument();
    expect(screen.queryByText("工作区")).not.toBeInTheDocument();
    expect(screen.queryByText("系统")).not.toBeInTheDocument();
    expect(screen.queryByText("浏览 skill unit，选择目标并预览分发计划。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "技能" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "展开侧边栏" })).not.toBeInTheDocument();
  });

  it("uses shared tooltip components in collapsed navigation without badges", async () => {
    await renderSidebar({ isCollapsed: true });

    const sidebar = screen.getByRole("complementary", { name: "主导航" });

    expect(sidebar.querySelectorAll('[data-slot="badge"]')).toHaveLength(0);
    expect(screen.getByRole("button", { name: "技能" })).not.toHaveAttribute("title");
    expect(
      sidebar.querySelector('[data-slot="tooltip-trigger"][aria-label="Skillport"]')
    ).toBeTruthy();
  });

  it("does not render sidebar navigation badges", async () => {
    await renderSidebar();

    const sidebar = screen.getByRole("complementary", { name: "主导航" });

    expect(sidebar.querySelectorAll('[data-slot="badge"]')).toHaveLength(0);
  });

  it("renders localized navigation labels without group headings", async () => {
    await renderSidebar();

    expect(screen.queryByText("工作区")).not.toBeInTheDocument();
    expect(screen.queryByText("系统")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /来源/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "技能" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /目标/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步历史" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /设置/ })).toBeInTheDocument();
  });

  it("shows the active navigation item description at the bottom of the expanded sidebar", async () => {
    await renderSidebar({ activeRouteId: "skills" });

    expect(screen.getByText("浏览 skill unit，选择目标并预览分发计划。")).toBeInTheDocument();
  });

  it("does not repeat the active navigation label in the sidebar footer", async () => {
    await renderSidebar({ activeRouteId: "skills" });

    expect(screen.getAllByText("技能")).toHaveLength(1);
  });

  it("falls back to the app version when the active navigation item has no description", async () => {
    await renderSidebar({ activeRouteId: "settings", appVersion: "2.3.4" });

    expect(screen.getByText("版本: 2.3.4")).toBeInTheDocument();
  });

  it("renders icons for every visible navigation item when expanded", async () => {
    await renderSidebar();

    const sidebar = screen.getByRole("complementary", { name: "主导航" });
    const visibleButtons = screen.getAllByRole("button").filter((button) => button !== null);
    const navigationButtons = visibleButtons.filter((button) => button.closest("nav"));

    expect(navigationButtons).toHaveLength(6);
    expect(sidebar.querySelectorAll("nav button svg")).toHaveLength(6);
  });
});

describe("shellNavigationGroups", () => {
  it("defines route ids for visible workspace and system navigation", () => {
    const visibleRouteIds = shellNavigationGroups.flatMap((group) =>
      group.items.filter((item) => !item.hidden).map((item) => item.routeId)
    );

    expect(visibleRouteIds).toEqual([
      "repositories",
      "skills",
      "targets",
      "distribution",
      "settings",
      "sync-history"
    ]);
  });
});
