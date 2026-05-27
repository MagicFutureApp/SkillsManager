import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

import { AppSidebar } from "./AppSidebar";
import { shellNavigationGroups } from "./shellNavigation";

describe("AppSidebar", () => {
  it("uses Providers as the first workspace route instead of Sources", () => {
    render(<AppSidebar activeRouteId="providers" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Provider/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("keeps diagnostics hidden from the visible sidebar navigation", () => {
    render(<AppSidebar activeRouteId="skills" onNavigate={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Diagnostics/i })).not.toBeInTheDocument();
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
