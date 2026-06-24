import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { createI18nInstance } from "@/i18n/react-i18n";
import { TargetsPage } from "./targets-page";
import type { TargetsListResult } from "@/global";

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

const rescannedTargetsFixture: TargetsListResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-23T00:00:00.000Z",
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "system-codex",
      name: "Codex",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "detected",
      type: "codex",
      updatedAt: "2026-06-23T00:00:00.000Z"
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

    fireEvent.click(screen.getByRole("button", { name: "重新扫描" }));

    await waitFor(() => {
      expect(window.skillsManager?.rescanTargets).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: "Codex" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Local project" })).not.toBeInTheDocument();
    const detail = screen.getByLabelText("目标详情");
    expect(within(detail).getByRole("heading", { name: "Codex" })).toBeInTheDocument();
    expect(within(detail).getByText("已检测")).toBeInTheDocument();
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
