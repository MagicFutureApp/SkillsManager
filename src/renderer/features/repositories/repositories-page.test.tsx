import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { RepositoriesPage } from "./repositories-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import type { RepositoriesSyncResult } from "@/global";
import { providerApiRecordsFixture, repositoryApiRecordsFixture } from "@/test/api-fixtures";

const renderRepositoriesPage = async (locale: "zh-CN" | "en-US" = "zh-CN") => {
  const i18n = await createI18nInstance(locale);
  const skillsManager = window.skillsManager;

  window.skillsManager = {
    getHealth: vi.fn().mockResolvedValue({
      chrome: "130.0.0",
      electron: "42.2.0",
      node: "25.0.0",
      platform: "win32"
    }),
    getInfo: vi.fn().mockResolvedValue({ version: "0.1.0" }),
    getLocale: vi.fn().mockResolvedValue("zh-CN"),
    createRepository: skillsManager?.createRepository,
    deleteRepository: skillsManager?.deleteRepository,
    getRepositoryDeletePreview: skillsManager?.getRepositoryDeletePreview,
    inspectRepositorySource: skillsManager?.inspectRepositorySource,
    listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
    listRepositories:
      skillsManager?.listRepositories ??
      vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
    syncRepositories: skillsManager?.syncRepositories,
    platform: "win32"
  };

  const result = render(
    <I18nextProvider i18n={i18n}>
      <RepositoriesPage />
    </I18nextProvider>
  );

  await screen.findByRole("button", { name: "Team skills repository" });

  return result;
};

const selectOption = async (label: string, optionName: string) => {
  fireEvent.pointerDown(screen.getByLabelText(label), { pointerType: "mouse" });
  fireEvent.mouseDown(screen.getByLabelText(label), { button: 0 });
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
};

describe("RepositoriesPage", () => {
  beforeEach(() => {
    window.skillsManager = undefined;
  });

  it("renders the repositories management surface from the HTML mockup", async () => {
    await renderRepositoriesPage();

    expect(screen.getByRole("heading", { name: "来源管理" })).toBeInTheDocument();
    expect(screen.getByText("管理 Git 和其他来源的Skills。")).toBeInTheDocument();
    expect(screen.getByLabelText("来源筛选")).toHaveClass(
      "grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
    );
    expect(screen.getByLabelText("搜索")).toBeInTheDocument();
    expect(screen.getByLabelText("类型")).toBeInTheDocument();
    expect(screen.getByLabelText("状态")).toBeInTheDocument();
    expect(screen.queryByText("启用仓库")).not.toBeInTheDocument();
    expect(screen.queryByText("已索引技能")).not.toBeInTheDocument();
    expect(screen.queryByText("需要复核")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "新增" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "强制重新扫描" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team skills repository" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("heading", { name: "Team skills repository" })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("来源详情")).getByRole("button", { name: "编辑" })
    ).toBeInTheDocument();
    expect(screen.getByText("同步影响")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Team skills repository" }).closest("div")
    ).toHaveClass(
      "grid-cols-[34px_minmax(0,1.7fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_34px_minmax(52px,0.45fr)]"
    );
  });

  it("filters sources by provider and status", async () => {
    await renderRepositoriesPage();

    await selectOption("类型", "GitLab");
    expect(screen.getByRole("button", { name: "Design lab prompts" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Team skills repository" })
    ).not.toBeInTheDocument();

    await selectOption("状态", "ready");
    expect(screen.getByText("没有匹配的来源。调整搜索或筛选条件。")).toBeInTheDocument();
  });

  it("updates the detail pane when a source row is selected", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "Local development skills" }));

    const detail = screen.getByLabelText("来源详情");
    expect(
      within(detail).getByRole("heading", { name: "Local development skills" })
    ).toBeInTheDocument();
    expect(within(detail).getAllByText("D:/workspace/local-skills").length).toBeGreaterThan(0);
    expect(
      within(detail).getByText("agents/skills/*/SKILL.md, skills/*/SKILL.md")
    ).toBeInTheDocument();
  });

  it("enables sync after a source is checked", async () => {
    await renderRepositoriesPage();

    const syncButton = screen.getByRole("button", { name: "同步" });
    expect(syncButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText("选择 Design lab prompts"));
    expect(syncButton).toBeEnabled();
  });

  it("confirms local source copy before syncing checked local paths", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const syncRepositories = vi.fn().mockResolvedValue({
      results: [
        {
          commitSha: "local",
          repositoryId: "local-dev-skills",
          scan: { added: 1, changed: 0, removed: 0, warnings: 0 },
          skillUnits: 1,
          status: "ready"
        }
      ]
    });
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("会复制文件");
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("旧地址的文件需要用户手动删除");
    await waitFor(() => expect(syncRepositories).toHaveBeenCalledWith(["local-dev-skills"]));
    expect(listRepositories).toHaveBeenCalledTimes(2);

    confirmSpy.mockRestore();
  });

  it("syncs a single source from the row sync icon", async () => {
    const syncRepositories = vi.fn().mockResolvedValue({
      results: [
        {
          commitSha: "8f2c91a",
          repositoryId: "team-skills",
          scan: { added: 0, changed: 1, removed: 0, warnings: 0 },
          skillUnits: 12,
          status: "ready"
        }
      ]
    });
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("Team skills repository 尚未开始同步。"));

    await waitFor(() => expect(syncRepositories).toHaveBeenCalledWith(["team-skills"]));
    expect(listRepositories).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByLabelText(
        "Team skills repository 同步完成。已入库 12 个 Skills。新增 0，更新 1，移除 0，警告 0。commit 8f2c91a"
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Team skills repository")).not.toBeChecked();
  });

  it("shows an animated per-source sync indicator while a source is syncing", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolveSync: (value: RepositoriesSyncResult) => void = () => undefined;
    const syncRepositories = vi.fn(
      () =>
        new Promise<RepositoriesSyncResult>((resolve) => {
          resolveSync = resolve;
        })
    );

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    const indicator = await screen.findByLabelText(
      "Local development skills 正在同步。正在复制或拉取来源，并扫描 SKILL.md。缓存目录 D:/workspace/local-skills"
    );
    expect(indicator).not.toHaveClass("animate-spin");
    expect(indicator).not.toBeDisabled();
    expect(indicator).toHaveAttribute("aria-disabled", "true");
    expect(indicator.querySelector("svg")).toHaveClass("animate-spin");

    resolveSync({
      results: [
        {
          commitSha: "local",
          repositoryId: "local-dev-skills",
          scan: { added: 1, changed: 0, removed: 0, warnings: 0 },
          skillUnits: 1,
          status: "ready"
        }
      ]
    });

    confirmSpy.mockRestore();
  });

  it("keeps batch sync available and skips sources that are already syncing", async () => {
    let resolveSync: (value: RepositoriesSyncResult) => void = () => undefined;
    const syncRepositories = vi.fn((repositoryIds: string[]): Promise<RepositoriesSyncResult> => {
      if (repositoryIds.includes("team-skills")) {
        return new Promise<RepositoriesSyncResult>((resolve) => {
          resolveSync = resolve;
        });
      }

      return Promise.resolve({
        results: [
          {
            commitSha: "21ab9d0",
            repositoryId: "design-lab",
            scan: { added: 0, changed: 1, removed: 0, warnings: 0 },
            skillUnits: 7,
            status: "ready"
          }
        ]
      });
    });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("Team skills repository 尚未开始同步。"));
    await screen.findByLabelText(
      "Team skills repository 正在同步。正在复制或拉取来源，并扫描 SKILL.md。缓存目录 ~/.skills-manager/cache/team-skills"
    );

    fireEvent.click(screen.getByLabelText("选择 Team skills repository"));
    fireEvent.click(screen.getByLabelText("选择 Design lab prompts"));
    expect(screen.getByRole("button", { name: "同步" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    await waitFor(() => expect(syncRepositories).toHaveBeenCalledTimes(2));
    expect(syncRepositories).toHaveBeenNthCalledWith(1, ["team-skills"]);
    expect(syncRepositories).toHaveBeenNthCalledWith(2, ["design-lab"]);
    expect(
      await screen.findByLabelText(
        "Design lab prompts 同步完成。已入库 7 个 Skills。新增 0，更新 1，移除 0，警告 0。commit 21ab9d0"
      )
    ).toBeInTheDocument();

    resolveSync({
      results: [
        {
          commitSha: "8f2c91a",
          repositoryId: "team-skills",
          scan: { added: 0, changed: 1, removed: 0, warnings: 0 },
          skillUnits: 12,
          status: "ready"
        }
      ]
    });
  });

  it("keeps a successful per-source sync indicator with the result summary", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const syncRepositories = vi.fn().mockResolvedValue({
      results: [
        {
          commitSha: "local",
          repositoryId: "local-dev-skills",
          scan: { added: 1, changed: 0, removed: 0, warnings: 0 },
          skillUnits: 1,
          status: "ready"
        }
      ]
    });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    expect(
      await screen.findByLabelText(
        "Local development skills 同步完成。已入库 1 个 Skills。新增 1，更新 0，移除 0，警告 0。commit local"
      )
    ).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("keeps a failed per-source sync indicator with the error message", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const syncRepositories = vi.fn().mockRejectedValue(new Error("Permission denied"));

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    expect(
      await screen.findByLabelText("Local development skills 同步失败。Permission denied")
    ).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("shows the friendly failure from a per-source sync result", async () => {
    const friendlyMessage =
      "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。";
    const syncRepositories = vi.fn().mockResolvedValue({
      results: [
        {
          error: {
            category: "network",
            logPath: "/tmp/sync.log",
            message: friendlyMessage
          },
          repositoryId: "team-skills",
          scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
          skillUnits: 0,
          status: "failed"
        }
      ]
    });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Team skills repository"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    expect(
      await screen.findByLabelText(`Team skills repository 同步失败。${friendlyMessage}`)
    ).toBeInTheDocument();
    expect(screen.queryByText("RPC failed")).not.toBeInTheDocument();
  });

  it("toggles source enabled state from the table", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "skills.sh market index" }));
    const switchControl = screen.getByRole("switch", { name: "启用 skills.sh market index" });
    expect(switchControl).toHaveAttribute("aria-checked", "false");

    fireEvent.click(switchControl);
    expect(switchControl).toHaveAttribute("aria-checked", "true");
    expect(within(screen.getByLabelText("来源详情")).getByText("true")).toBeInTheDocument();
  });

  it("adds a source through the modal form", async () => {
    const createRepository = vi.fn().mockResolvedValue({
      branch: "main",
      configJson: JSON.stringify({
        enabled: true,
        lastScanLabel: "未执行",
        note: "用户新增的来源，等待第一次同步扫描。",
        patterns: [],
        priority: 1,
        providerName: "GitHub",
        scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
        skillUnits: 0,
        status: "review"
      }),
      id: "repo-huashu-design",
      lastScannedCommitSha: null,
      localCachePath: "~/.skills-manager/cache/huashu-design",
      name: "huashu-design",
      providerId: "github",
      remoteUrl: "https://github.com/alchaincyf/huashu-design",
      updatedAt: "2026-06-12T00:00:00.000Z"
    });
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({
        repositories: [
          {
            branch: "main",
            configJson: JSON.stringify({
              enabled: true,
              lastScanLabel: "未执行",
              note: "用户新增的来源，等待第一次同步扫描。",
              patterns: [],
              priority: 1,
              providerName: "GitHub",
              scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
              skillUnits: 0,
              status: "review"
            }),
            id: "repo-huashu-design",
            lastScannedCommitSha: null,
            localCachePath: "~/.skills-manager/cache/huashu-design",
            name: "huashu-design",
            providerId: "github",
            remoteUrl: "https://github.com/alchaincyf/huashu-design",
            updatedAt: "2026-06-12T00:00:00.000Z"
          },
          ...repositoryApiRecordsFixture
        ]
      });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      createRepository,
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32"
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    const remoteUrlField = within(dialog).getByLabelText("URL / 本机路径");
    const nameField = within(dialog).getByLabelText("名称");
    const providerField = within(dialog).getByLabelText("来源类型");
    const branchField = within(dialog).getByLabelText("分支");
    const patternsField = within(dialog).getByLabelText("发现入口");
    expect(remoteUrlField.compareDocumentPosition(nameField)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(nameField.compareDocumentPosition(providerField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(providerField.compareDocumentPosition(branchField)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(branchField.compareDocumentPosition(patternsField)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(patternsField).toHaveValue("");
    expect(patternsField).toHaveAttribute("placeholder", "例: skills/*/SKILL.md 或 SKILL.md 等");
    expect(within(dialog).queryByText("缓存目录")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("名称"), {
      target: { value: "huashu-design" }
    });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "https://github.com/alchaincyf/huashu-design" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存来源" }));

    await waitFor(() =>
      expect(createRepository).toHaveBeenCalledWith({
        branch: "main",
        name: "huashu-design",
        note: "",
        patterns: "",
        provider: "GitHub",
        remoteUrl: "https://github.com/alchaincyf/huashu-design"
      })
    );
    expect(listRepositories).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "huashu-design" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "huashu-design" })).toBeInTheDocument();
  });

  it("deletes a source from the detail pane after confirming affected skills", async () => {
    const getRepositoryDeletePreview = vi.fn().mockResolvedValue({
      localCachePath: "~/.skills-manager/cache/team-skills",
      repositoryId: "team-skills",
      repositoryName: "Team skills repository",
      skills: [
        {
          entryPath: "skills/review-bot/SKILL.md",
          id: "skill-1",
          name: "review-bot"
        },
        {
          entryPath: "skills/release-notes/SKILL.md",
          id: "skill-2",
          name: "release-notes"
        }
      ]
    });
    const deleteRepository = vi.fn().mockResolvedValue({
      deletedRepositoryId: "team-skills",
      deletedSkillUnitIds: ["skill-1", "skill-2"],
      localCachePath: "~/.skills-manager/cache/team-skills"
    });
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({
        repositories: repositoryApiRecordsFixture.filter(
          (repository) => repository.id !== "team-skills"
        )
      });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      deleteRepository,
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      getRepositoryDeletePreview,
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32"
    };
    await renderRepositoriesPage();

    const detail = screen.getByLabelText("来源详情");
    fireEvent.click(within(detail).getByRole("button", { name: "删除" }));

    const dialog = await screen.findByRole("dialog", { name: "删除来源" });
    expect(getRepositoryDeletePreview).toHaveBeenCalledWith("team-skills");
    expect(
      within(dialog).getByText(
        "会删除此来源对应的 Skills 记录和来源同步到本地的缓存文件。不会删除已经同步到 Codex、Claude Code、Gemini CLI 或自定义目标目录的文件。"
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByText("review-bot")).toBeInTheDocument();
    expect(within(dialog).getByText("skills/review-bot/SKILL.md")).toBeInTheDocument();
    expect(within(dialog).getByText("release-notes")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(deleteRepository).toHaveBeenCalledWith("team-skills"));
    expect(listRepositories).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole("button", { name: "Team skills repository" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Local development skills" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("closes the source modal with Escape", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    expect(screen.getByRole("dialog", { name: "新增来源" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "新增来源" })).not.toBeInTheDocument();
  });

  it("autofills source metadata and a string discovery entry after entering a GitHub repository URL", async () => {
    const inspectRepositorySource = vi.fn().mockResolvedValue({
      about: "Composable Claude skills from Anthropic.",
      branch: "main",
      name: "anthropics/skills",
      patterns: ["SKILL.md"],
      provider: "GitHub"
    });
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      inspectRepositorySource,
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32"
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "https://github.com/anthropics/skills" }
    });

    expect(await within(dialog).findByDisplayValue("anthropics/skills")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("来源类型")).toHaveTextContent("GitHub");
    expect(within(dialog).getByLabelText("分支")).toHaveValue("main");
    expect(within(dialog).getByLabelText("发现入口")).toHaveValue("SKILL.md");
    expect(within(dialog).getByLabelText("备注")).toHaveValue(
      "Composable Claude skills from Anthropic."
    );
    expect(inspectRepositorySource).toHaveBeenCalledWith("https://github.com/anthropics/skills");
  });

  it("keeps the discovery entry empty when source inspection does not find an entry", async () => {
    const inspectRepositorySource = vi.fn().mockResolvedValue({
      branch: "main",
      name: "example/no-skills",
      patterns: [],
      provider: "GitHub"
    });
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      inspectRepositorySource,
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32"
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "https://github.com/example/no-skills" }
    });

    expect(await within(dialog).findByDisplayValue("example/no-skills")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("发现入口")).toHaveValue("");
    expect(inspectRepositorySource).toHaveBeenCalledWith("https://github.com/example/no-skills");
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderRepositoriesPage("en-US");

    expect(
      screen.getByRole("heading", { name: "Manage sources and scan results" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Source filters")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Source details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
