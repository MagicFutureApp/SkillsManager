import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { createI18nInstance } from "@/i18n/react-i18n";
import { SyncHistoryPage } from "./sync-history-page";

const syncRuns = [
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
];

const renderSyncHistoryPage = async () => {
  const i18n = await createI18nInstance("zh-CN");

  window.skillsManager = {
    getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
    getInfo: vi.fn().mockResolvedValue({ version: "0.1.0" }),
    getLocale: vi.fn().mockResolvedValue("zh-CN"),
    listProviders: vi.fn().mockResolvedValue({ providers: [] }),
    listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
    listSyncHistory: vi.fn().mockResolvedValue({ syncRuns }),
    platform: "darwin"
  };

  const result = render(
    <I18nextProvider i18n={i18n}>
      <SyncHistoryPage />
    </I18nextProvider>
  );

  await screen.findByRole("button", { name: "Team skills 失败" });

  return result;
};

describe("SyncHistoryPage", () => {
  beforeEach(() => {
    window.skillsManager = undefined;
  });

  it("renders source sync runs and shows failed run details", async () => {
    const { container } = await renderSyncHistoryPage();

    expect(screen.getByRole("heading", { name: "同步历史" })).toBeInTheDocument();
    expect(screen.getByText("查看 source sync 写入的运行记录和失败日志。")).toBeInTheDocument();
    expect(window.skillsManager?.listSyncHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("complementary", { name: "同步运行详情" })).toHaveClass(
      "border-l",
      "bg-card"
    );
    expect(container.querySelector("main")).toHaveClass("min-w-0", "p-7");
    expect(container.firstElementChild).toHaveClass("grid-cols-[minmax(620px,1fr)_360px]");

    const failedRow = screen.getByRole("button", { name: "Team skills 失败" });
    expect(failedRow.className).toContain("minmax(176px,0.95fr)");
    expect(within(failedRow).getByText("2026/06/20 10:00")).toBeInTheDocument();
    expect(within(failedRow).getByText("新增 0 / 更新 0 / 移除 0 / 警告 1")).toBeInTheDocument();

    const detail = screen.getByLabelText("同步运行详情");
    expect(within(detail).getByRole("heading", { name: "Team skills" })).toBeInTheDocument();
    expect(within(detail).getByText("失败")).toBeInTheDocument();
    expect(within(detail).getByText("没有权限访问这个 Git 来源。")).toBeInTheDocument();
    expect(within(detail).getByText("/tmp/skills-manager-sync/repo-1.log")).toBeInTheDocument();
    expect(within(detail).getByText("after-sha")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Team skills 成功" }));

    await waitFor(() => {
      expect(within(detail).getByText("after-sha")).toBeInTheDocument();
      expect(within(detail).getByText("before-sha")).toBeInTheDocument();
    });
    expect(within(detail).getByText("成功")).toBeInTheDocument();
    expect(within(detail).getAllByText("无").length).toBeGreaterThan(0);
  });
});
