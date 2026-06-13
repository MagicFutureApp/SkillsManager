import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { RepositoriesPage } from "./repositories-page";
import { createI18nInstance } from "@/i18n/react-i18n";
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
      "grid-cols-[34px_minmax(0,1.7fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_minmax(52px,0.45fr)]"
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

    fireEvent.click(syncButton);
    expect(
      within(screen.getByLabelText("来源详情")).getAllByText("刚刚同步").length
    ).toBeGreaterThan(0);
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
        patterns: [],
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

  it("autofills source metadata without changing discovery entries after entering a GitHub repository URL", async () => {
    const inspectRepositorySource = vi.fn().mockResolvedValue({
      about: "Composable Claude skills from Anthropic.",
      branch: "main",
      name: "anthropics/skills",
      patterns: ["skills/*/SKILL.md"],
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
    expect(within(dialog).getByLabelText("发现入口")).toHaveValue("");
    expect(within(dialog).getByLabelText("备注")).toHaveValue(
      "Composable Claude skills from Anthropic."
    );
    expect(inspectRepositorySource).toHaveBeenCalledWith("https://github.com/anthropics/skills");
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
