import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

import { AppSidebar } from "./app-sidebar";
import { shellNavigationGroups } from "./shell-navigation";

describe("AppSidebar", () => {
  it("uses Providers as the first workspace route instead of Sources", () => {
    render(
      <AppSidebar
        activeRouteId="providers"
        isAutoCollapsed={false}
        isCollapsed={false}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Provider/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("keeps diagnostics hidden from the visible sidebar navigation", () => {
    render(
      <AppSidebar
        activeRouteId="skills"
        isAutoCollapsed={false}
        isCollapsed={false}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Diagnostics/i })).not.toBeInTheDocument();
  });

  it("does not render a manual sidebar collapse toggle", () => {
    render(
      <AppSidebar
        activeRouteId="skills"
        isAutoCollapsed={false}
        isCollapsed={false}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "收起侧边栏" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展开侧边栏" })).not.toBeInTheDocument();
  });

  it("uses compact navigation when the sidebar is collapsed", () => {
    render(
      <AppSidebar
        activeRouteId="skills"
        isAutoCollapsed={false}
        isCollapsed={true}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole("complementary", { name: "主导航" })).toHaveAttribute(
      "data-collapsed",
      "true"
    );
    expect(screen.queryByText("Local-first desktop")).not.toBeInTheDocument();
    expect(screen.queryByText("工作区")).not.toBeInTheDocument();
    expect(screen.queryByText("计划优先")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skills" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "展开侧边栏" })).not.toBeInTheDocument();
  });

  it("uses shared badge and tooltip components in collapsed navigation", () => {
    render(
      <AppSidebar
        activeRouteId="skills"
        isAutoCollapsed={false}
        isCollapsed={true}
        onNavigate={vi.fn()}
      />
    );

    const sidebar = screen.getByRole("complementary", { name: "主导航" });
    const badges = sidebar.querySelectorAll('[data-slot="badge"]');

    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Skills" })).not.toHaveAttribute("title");
    expect(
      sidebar.querySelector('[data-slot="tooltip-trigger"][aria-label="Skillport"]')
    ).toBeTruthy();
  });

  it("hides badges with a zero value", () => {
    render(
      <AppSidebar
        activeRouteId="skills"
        isAutoCollapsed={false}
        isCollapsed={false}
        onNavigate={vi.fn()}
      />
    );

    const sidebar = screen.getByRole("complementary", { name: "主导航" });
    const badgeTexts = Array.from(sidebar.querySelectorAll('[data-slot="badge"]')).map((badge) =>
      badge.textContent?.trim()
    );

    expect(badgeTexts).not.toContain("0");
    expect(badgeTexts).toEqual(["6", "5", "4", "8", "4"]);
  });
});

describe("shellNavigationGroups", () => {
  it("defines route ids for visible workspace and system navigation", () => {
    const visibleRouteIds = shellNavigationGroups.flatMap((group) =>
      group.items.filter((item) => !item.hidden).map((item) => item.routeId)
    );

    expect(visibleRouteIds).toEqual([
      "providers",
      "repositories",
      "skills",
      "targets",
      "distribution",
      "settings",
      "sync-history"
    ]);
  });
});
