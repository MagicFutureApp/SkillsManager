import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { createI18nInstance } from "@/i18n/react-i18n";
import { TargetsPage } from "./targets-page";
import type { TargetsListResult } from "@/global";

const targetsFixture: TargetsListResult = {
  detectedTargets: [
    {
      defaultInstallStrategy: "copy",
      executablePath: "/usr/local/bin/codex",
      id: "system-codex-cli",
      installPath: "/usr/local/bin/codex",
      name: "Codex CLI",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      status: "detected",
      type: "codex-cli"
    },
    {
      defaultInstallStrategy: "copy",
      executablePath: null,
      id: "system-claude-code",
      installPath: null,
      name: "Claude Code",
      normalizedPath: "/Users/test/.claude/skills",
      path: "/Users/test/.claude/skills",
      status: "missing",
      type: "claude-code"
    }
  ],
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
      skillCount: 2,
      type: "custom-directory",
      updatedAt: "2026-06-21T00:00:00.000Z"
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

  it("renders detected app targets and selected local project targets without sync actions", async () => {
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

    expect(screen.getByRole("button", { name: "Codex CLI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude Code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Local project" })).toBeInTheDocument();
    expect(screen.getByText("/Users/test/project/.codex/skills")).toBeInTheDocument();
    expect(screen.getByText("2 个技能")).toBeInTheDocument();
    const header = screen.getByLabelText("目标列表表头");
    expect(within(header).getByText("目标")).toBeInTheDocument();
    expect(within(header).getByText("路径")).toBeInTheDocument();
    expect(within(header).getByText("技能")).toBeInTheDocument();
    expect(within(header).queryByText("状态")).not.toBeInTheDocument();
    expect(within(header).queryByText("来源")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "状态" })).not.toBeInTheDocument();

    const detail = screen.getByLabelText("目标详情");
    expect(within(detail).getByRole("heading", { name: "Codex CLI" })).toBeInTheDocument();
    expect(within(detail).getByText("已检测")).toBeInTheDocument();
  });

  it("selects a target when clicking a non-interactive row cell", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });

    fireEvent.click(screen.getByText("/Users/test/project/.codex/skills"));

    expect(
      within(screen.getByLabelText("目标详情")).getByRole("heading", { name: "Local project" })
    ).toBeInTheDocument();
  });
});
