import { act, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { useShellStore } from "@/stores/shell-store";
import { createI18nInstance } from "@/i18n/react-i18n";
import type { AppHealth } from "@/global";
import type { SyncHistoryListResult, TargetsListResult } from "@/global";
import {
  providerApiRecordsFixture,
  repositoryApiRecordsFixture,
  skillApiRecordsFixture
} from "@/test/api-fixtures";

import { AppShell } from "./app-shell";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/skills" }),
  useNavigate: () => vi.fn()
}));

const targetsFixture: TargetsListResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-21T00:00:00.000Z",
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "target-project",
      name: "Local project",
      normalizedPath: "/Users/test/project/.codex/skills",
      path: "/Users/test/project/.codex/skills",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-21T00:00:00.000Z"
    }
  ]
};

const syncHistoryFixture: SyncHistoryListResult = {
  syncRuns: [
    {
      endCommitSha: null,
      errorMessage: "没有权限访问这个 Git 来源。",
      finishedAt: "2026-06-20T02:01:00.000Z",
      id: "sync-failed",
      logPath: "/tmp/skills-manager-sync/repo-1.log",
      repositoryId: "repo-1",
      repositoryName: "Team skills",
      repositoryRemoteUrl: "git@github.com:team/skills.git",
      scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
      startCommitSha: "after-sha",
      startedAt: "2026-06-20T02:00:00.000Z",
      status: "failed",
      summaryJson: JSON.stringify({
        category: "auth",
        scan: { added: 0, changed: 0, removed: 0, warnings: 1 }
      })
    },
    {
      endCommitSha: "after-sha",
      errorMessage: null,
      finishedAt: "2026-06-20T01:01:00.000Z",
      id: "sync-success",
      logPath: null,
      repositoryId: "repo-1",
      repositoryName: "Team skills",
      repositoryRemoteUrl: "git@github.com:team/skills.git",
      scan: { added: 2, changed: 1, removed: 0, warnings: 0 },
      startCommitSha: "before-sha",
      startedAt: "2026-06-20T01:00:00.000Z",
      status: "success",
      summaryJson: JSON.stringify({ added: 2, changed: 1, removed: 0, warnings: 0 })
    }
  ]
};

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

const setMockPlatform = (platform: AppHealth["platform"]) => {
  const getHealth = window.skillsManager?.getHealth;

  if (!getHealth) {
    throw new Error("window.skillsManager.getHealth is not configured");
  }

  vi.mocked(getHealth).mockResolvedValue({
    chrome: "130.0.0",
    electron: "42.2.0",
    node: "25.0.0",
    platform
  });
};

describe("AppShell", () => {
  beforeEach(() => {
    window.skillsManager = {
      getHealth: vi.fn(),
      getInfo: vi.fn().mockResolvedValue({ version: "9.8.7" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      listSkills: vi.fn().mockResolvedValue({ skills: skillApiRecordsFixture }),
      listSyncHistory: vi.fn().mockResolvedValue(syncHistoryFixture),
      listTargets: vi.fn().mockResolvedValue(targetsFixture),
      platform: "win32"
    };
    setMockPlatform("win32");

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

  it("keeps the app identity clear of Windows window controls", async () => {
    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    const titlebar = screen.getByTestId("app-titlebar-spacer");

    expect(titlebar).toHaveClass("border-b", "pl-4", "pr-[138px]");
    expect(titlebar).not.toHaveClass("justify-center", "px-[138px]");
    expect(screen.queryByTestId("app-titlebar-border")).not.toBeInTheDocument();
    expect(within(titlebar).getByRole("img", { name: "Skillport" })).toBeInTheDocument();
    expect(within(titlebar).getByText("Skillport")).toBeInTheDocument();
  });

  it("centers the app identity in the macOS custom title bar", async () => {
    setMockPlatform("darwin");

    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(screen.getByTestId("app-titlebar-spacer")).toHaveClass("justify-center", "px-[138px]");
    });

    expect(screen.getByTestId("app-titlebar-spacer")).not.toHaveClass("pl-4", "pr-[138px]");
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

  it("loads the application version from the Electron API for sidebar fallback text", async () => {
    const getInfo = vi.mocked(window.skillsManager?.getInfo);
    expect(getInfo).toBeDefined();

    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(getInfo).toHaveBeenCalled();
    });
  });

  it("loads sidebar badge counts from the Electron count API", async () => {
    const getNavigationBadgeCounts = vi.fn().mockResolvedValue({
      counts: {
        repositories: 12,
        skills: 37,
        targets: 3,
        "sync-history": 9
      }
    });
    window.skillsManager = {
      ...window.skillsManager,
      getNavigationBadgeCounts
    } as typeof window.skillsManager & {
      getNavigationBadgeCounts: typeof getNavigationBadgeCounts;
    };

    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(getNavigationBadgeCounts).toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "来源" })).toHaveTextContent("12");
      expect(screen.getByRole("button", { name: "技能" })).toHaveTextContent("37");
      expect(screen.getByRole("button", { name: "目标" })).toHaveTextContent("3");
      expect(screen.getByRole("button", { name: "同步历史" })).toHaveTextContent("9");
    });
  });

  it("does not derive sidebar badge counts from paged list API results", async () => {
    const getNavigationBadgeCounts = vi.fn().mockResolvedValue({
      counts: {
        repositories: 12,
        skills: 37,
        targets: 3,
        "sync-history": 9
      }
    });
    const listRepositories = vi
      .fn()
      .mockResolvedValue({ repositories: repositoryApiRecordsFixture });
    const listSkills = vi.fn().mockResolvedValue({ skills: skillApiRecordsFixture });
    const listSyncHistory = vi.fn().mockResolvedValue(syncHistoryFixture);
    const listTargets = vi.fn().mockResolvedValue(targetsFixture);
    window.skillsManager = {
      ...window.skillsManager,
      getNavigationBadgeCounts,
      listRepositories,
      listSkills,
      listSyncHistory,
      listTargets
    } as typeof window.skillsManager & {
      getNavigationBadgeCounts: typeof getNavigationBadgeCounts;
    };

    await renderAppShell(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(getNavigationBadgeCounts).toHaveBeenCalled();
      expect(listRepositories).not.toHaveBeenCalled();
      expect(listSkills).not.toHaveBeenCalled();
      expect(listSyncHistory).not.toHaveBeenCalled();
      expect(listTargets).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "来源" })).toHaveTextContent("12");
      expect(screen.getByRole("button", { name: "技能" })).toHaveTextContent("37");
      expect(screen.getByRole("button", { name: "目标" })).toHaveTextContent("3");
      expect(screen.getByRole("button", { name: "同步历史" })).toHaveTextContent("9");
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
