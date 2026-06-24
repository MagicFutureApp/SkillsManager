import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { createI18nInstance } from "@/i18n/react-i18n";
import { TargetsPage } from "./targets-page";
import type { TargetsListResult, TargetsRescanResult } from "@/global";

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
      selectedSkills: [
        { id: "skill-1", name: "Review Bot", repository: "Project skills" },
        { id: "skill-2", name: "Release Notes", repository: "Project skills" }
      ],
      skillPreferences: [
        { enabled: true, id: "skill-1", name: "Review Bot", repository: "Project skills" },
        { enabled: true, id: "skill-2", name: "Release Notes", repository: "Project skills" }
      ],
      skillCount: 2,
      scope: "global",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-21T00:00:00.000Z"
    },
    {
      createdAt: "2026-06-21T00:00:00.000Z",
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "target-design-only",
      name: "Design scratch",
      normalizedPath: "/Users/test/project/.design/skills",
      path: "/Users/test/project/.design/skills",
      scanMessage: null,
      selectedSkills: [{ id: "skill-3", name: "Design Helper", repository: "Design lab" }],
      skillPreferences: [
        { enabled: true, id: "skill-3", name: "Design Helper", repository: "Design lab" }
      ],
      skillCount: 1,
      scope: "independent",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-21T00:00:00.000Z"
    }
  ]
};

const rescannedTargetsFixture: TargetsRescanResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-23T00:00:00.000Z",
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "system-codex",
      name: "Codex",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      scanMessage: "Target directory exists and is writable.",
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "detected",
      type: "codex",
      updatedAt: "2026-06-23T00:00:00.000Z"
    }
  ],
  scanIssues: []
};

const rescannedTargetsWithIssuesFixture: TargetsRescanResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-23T00:00:00.000Z",
      defaultInstallStrategy: "copy",
      enabled: false,
      id: "target-project",
      name: "Local project",
      normalizedPath: "/Users/test/project/.codex/skills",
      path: "/Users/test/project/.codex/skills",
      scanMessage: "Target directory exists but is not writable.",
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "not-writable",
      type: "custom-directory",
      updatedAt: "2026-06-23T00:00:00.000Z"
    },
    {
      createdAt: "2026-06-23T00:00:00.000Z",
      defaultInstallStrategy: "copy",
      enabled: false,
      id: "system-gemini-cli",
      name: "Gemini CLI",
      normalizedPath: "/Users/test/.gemini/skills",
      path: "/Users/test/.gemini/skills",
      scanMessage: "Application is not installed.",
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "app-missing",
      type: "gemini-cli",
      updatedAt: "2026-06-23T00:00:00.000Z"
    }
  ],
  scanIssues: [
    {
      id: "target-project",
      message: "Target directory exists but is not writable.",
      name: "Local project",
      path: "/Users/test/project/.codex/skills",
      status: "not-writable",
      type: "custom-directory"
    },
    {
      id: "system-gemini-cli",
      message: "Application is not installed.",
      name: "Gemini CLI",
      path: "/Users/test/.gemini/skills",
      status: "app-missing",
      type: "gemini-cli"
    }
  ]
};

const renderTargetsPage = async (locale: "zh-CN" | "en-US" = "zh-CN") => {
  const i18n = await createI18nInstance(locale);

  window.skillsManager = {
    getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
    getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
    getLocale: vi.fn().mockResolvedValue(locale),
    listProviders: vi.fn().mockResolvedValue({ providers: [] }),
    listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
    listTargets: vi.fn().mockResolvedValue(targetsFixture),
    rescanTargets: vi.fn().mockResolvedValue(rescannedTargetsFixture),
    platform: "darwin"
  };

  return render(
    <I18nextProvider i18n={i18n}>
      <TargetsPage />
    </I18nextProvider>
  );
};

const advanceLoadingDuration = async (durationMs: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(durationMs);
  });
};

describe("TargetsPage", () => {
  beforeEach(() => {
    window.skillsManager = undefined;
  });

  it("renders database targets without mixing in system scan data on initial load", async () => {
    await renderTargetsPage();

    const pageHeading = await screen.findByRole("heading", { name: "目标管理" });
    const pageHeader = pageHeading.closest("header");

    expect(pageHeading).toBeInTheDocument();
    expect(pageHeader).not.toBeNull();
    expect(within(pageHeader as HTMLElement).queryByText("Targets")).not.toBeInTheDocument();
    expect(
      screen.getByText("扫描本机 agent 目录，并汇总 Skills 页面已选择的本地目标。")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新扫描" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增目标" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /同步/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("目标摘要")).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Codex" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claude Code" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Local project" })).toBeInTheDocument();
    const targetTable = within(screen.getByRole("main")).getByRole("table");
    expect(within(targetTable).getByText("/Users/test/project/.codex/skills")).toBeInTheDocument();
    expect(within(targetTable).getByText("2 个技能")).toBeInTheDocument();
    const header = within(targetTable).getByRole("row", { name: "目标 路径 范围 技能" });
    expect(within(header).getByText("目标")).toBeInTheDocument();
    expect(within(header).getByText("路径")).toBeInTheDocument();
    expect(within(header).getByText("范围")).toBeInTheDocument();
    expect(within(header).getByText("技能")).toBeInTheDocument();
    expect(within(header).queryByText("状态")).not.toBeInTheDocument();
    expect(within(header).queryByText("来源")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "状态" })).not.toBeInTheDocument();
    expect(screen.getAllByText("全局")[0]).toHaveClass(
      "rounded-full",
      "border",
      "font-mono",
      "text-xs"
    );
    expect(screen.getByText("独立")).toHaveClass("rounded-full", "border", "font-mono", "text-xs");

    const detail = screen.getByLabelText("目标详情");
    expect(within(detail).getByRole("heading", { name: "Local project" })).toBeInTheDocument();
    expect(within(detail).getByText("已登记")).toBeInTheDocument();
    expect(within(detail).queryByRole("heading", { name: "路径" })).not.toBeInTheDocument();
    expect(within(detail).queryByText("技能目录")).not.toBeInTheDocument();
    expect(within(detail).queryByText("安装目录")).not.toBeInTheDocument();
    expect(within(detail).queryByText("CLI 路径")).not.toBeInTheDocument();
  });

  it("rescans targets through the backend and renders the database-backed result", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });
    vi.useFakeTimers();

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "重新扫描" }));
      });

      await advanceLoadingDuration(2000);

      expect(window.skillsManager?.rescanTargets).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: "Codex" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Local project" })).not.toBeInTheDocument();
      const detail = screen.getByLabelText("目标详情");
      expect(within(detail).getByRole("heading", { name: "Codex" })).toBeInTheDocument();
      expect(within(detail).getByText("已检测")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a loading dialog while target rescan is running", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });
    vi.useFakeTimers();
    let resolveRescan: (result: TargetsRescanResult) => void = () => {};
    vi.mocked(window.skillsManager?.rescanTargets!).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRescan = resolve;
      })
    );

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "重新扫描" }));
      });

      const loadingDialog = screen.getByRole("dialog", { name: "正在扫描目标" });
      expect(
        within(loadingDialog).getByRole("status", { name: "正在扫描目标" })
      ).toBeInTheDocument();
      expect(screen.getByText("重新扫描").closest("button")).toBeDisabled();

      await act(async () => {
        resolveRescan(rescannedTargetsFixture);
      });

      expect(screen.getByRole("dialog", { name: "正在扫描目标" })).toBeInTheDocument();

      await advanceLoadingDuration(2000);

      expect(screen.queryByRole("dialog", { name: "正在扫描目标" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the loading dialog visible for at least two seconds", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });
    vi.useFakeTimers();
    let resolveRescan: (result: TargetsRescanResult) => void = () => {};
    vi.mocked(window.skillsManager?.rescanTargets!).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRescan = resolve;
      })
    );

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "重新扫描" }));
      });

      expect(screen.getByRole("dialog", { name: "正在扫描目标" })).toBeInTheDocument();

      await act(async () => {
        resolveRescan(rescannedTargetsFixture);
      });

      expect(screen.getByRole("dialog", { name: "正在扫描目标" })).toBeInTheDocument();

      await advanceLoadingDuration(1999);

      expect(screen.getByRole("dialog", { name: "正在扫描目标" })).toBeInTheDocument();

      await advanceLoadingDuration(1);

      expect(screen.queryByRole("dialog", { name: "正在扫描目标" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows scan issues only after the loading dialog closes", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });
    vi.useFakeTimers();
    let resolveRescan: (result: TargetsRescanResult) => void = () => {};
    vi.mocked(window.skillsManager?.rescanTargets!).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRescan = resolve;
      })
    );

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "重新扫描" }));
      });

      expect(screen.getByRole("dialog", { name: "正在扫描目标" })).toBeInTheDocument();

      await act(async () => {
        resolveRescan(rescannedTargetsWithIssuesFixture);
      });

      await advanceLoadingDuration(1999);

      expect(screen.getByRole("dialog", { name: "正在扫描目标" })).toBeInTheDocument();
      expect(
        screen.queryByRole("alertdialog", { name: "目标扫描发现异常" })
      ).not.toBeInTheDocument();

      await advanceLoadingDuration(1);

      expect(screen.queryByRole("dialog", { name: "正在扫描目标" })).not.toBeInTheDocument();
      expect(screen.getByRole("alertdialog", { name: "目标扫描发现异常" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a dialog when rescan finds missing or non-writable targets", async () => {
    await renderTargetsPage();
    vi.mocked(window.skillsManager?.rescanTargets!).mockResolvedValueOnce(
      rescannedTargetsWithIssuesFixture
    );
    await screen.findByRole("button", { name: "Local project" });
    vi.useFakeTimers();

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "重新扫描" }));
      });

      await advanceLoadingDuration(2000);

      const dialog = screen.getByRole("alertdialog", { name: "目标扫描发现异常" });

      expect(within(dialog).getByText("Local project")).toBeInTheDocument();
      expect(within(dialog).getByText("/Users/test/project/.codex/skills")).toBeInTheDocument();
      expect(within(dialog).getByText("不可写")).toBeInTheDocument();
      expect(within(dialog).getByText("Gemini CLI")).toBeInTheDocument();
      expect(within(dialog).getByText("/Users/test/.gemini/skills")).toBeInTheDocument();
      expect(within(dialog).getByText("应用未安装")).toBeInTheDocument();
      expect(screen.getAllByText("不可写").length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("selects a target when clicking a non-interactive row cell", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });
    const targetTable = within(screen.getByRole("main")).getByRole("table");

    fireEvent.click(within(targetTable).getByText("/Users/test/project/.codex/skills"));

    expect(
      within(screen.getByLabelText("目标详情")).getByRole("heading", { name: "Local project" })
    ).toBeInTheDocument();
  });
});
