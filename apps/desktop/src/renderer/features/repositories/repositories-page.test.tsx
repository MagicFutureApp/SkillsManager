import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { RepositoriesPage } from "./repositories-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import type { RepositoriesSyncResult } from "@/global";
import { providerApiRecordsFixture, repositoryApiRecordsFixture } from "@/test/api-fixtures";

type RepositorySyncProgressCallback = (event: {
  repositoryId: string;
  repositoryName: string;
  skill: {
    name: string;
    skillKey: string;
    skillUnitId: string;
  };
  status: "completed" | "syncing";
}) => void;

const renderRepositoriesPage = async (
  locale: "zh-CN" | "en-US" = "zh-CN",
  initialRepositoryName = "Team skills repository"
) => {
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
    openRepositoryLocation: skillsManager?.openRepositoryLocation,
    onRepositorySyncProgress: skillsManager?.onRepositorySyncProgress,
    selectLocalRepositoryPath: skillsManager?.selectLocalRepositoryPath,
    syncRepositories: skillsManager?.syncRepositories,
    updateRepository: skillsManager?.updateRepository,
    platform: "win32"
  };

  const result = render(
    <I18nextProvider i18n={i18n}>
      <RepositoriesPage />
    </I18nextProvider>
  );

  await screen.findByRole("button", { name: initialRepositoryName });

  return result;
};

const selectOption = async (label: string, optionName: string) => {
  fireEvent.pointerDown(screen.getByLabelText(label), { pointerType: "mouse" });
  fireEvent.mouseDown(screen.getByLabelText(label), { button: 0 });
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
};

const expectOnlyGitHubAndLocalProviderOptions = async () => {
  expect(await screen.findByRole("option", { name: "GitHub" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Local" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "GitLab" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Gitea" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Bitbucket" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "skills.sh" })).not.toBeInTheDocument();
};

const getRepositorySyncButton = (repositoryName: string) => {
  return screen.getByLabelText((_content, element) => {
    return (
      element?.tagName.toLowerCase() === "button" &&
      element.getAttribute("aria-label")?.startsWith(`${repositoryName} `) === true
    );
  });
};

const createPagedRepositoryRecords = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      ...repositoryApiRecordsFixture[0],
      configJson: JSON.stringify({
        enabled: true,
        lastScanLabel: "未执行",
        note: `Paged source ${number}`,
        patterns: ["skills/*/SKILL.md"],
        priority: index + 1,
        providerName: "GitHub",
        scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
        skillUnits: index + 1,
        status: "ready"
      }),
      id: `paged-source-${number}`,
      lastSync: null,
      lastScannedCommitSha: `commit-${number}`,
      localCachePath: `~/.skills-manager/cache/paged-source-${number}`,
      name: `Paged Source ${number}`,
      remoteUrl: `git@github.com:team/paged-source-${number}.git`
    };
  });

describe("RepositoriesPage", () => {
  beforeEach(() => {
    window.skillsManager = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the repositories management surface from the HTML mockup", async () => {
    await renderRepositoriesPage();

    const pageHeading = screen.getByRole("heading", { name: "来源管理" });
    const pageHeader = pageHeading.closest("header");

    expect(pageHeading).toBeInTheDocument();
    expect(pageHeader).not.toBeNull();
    expect(within(pageHeader as HTMLElement).queryByText("Sources")).not.toBeInTheDocument();
    expect(screen.getByText("管理 Git 和其他来源的 Skills。")).toBeInTheDocument();
    expect(screen.getByLabelText("来源筛选")).toHaveClass(
      "grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
    );
    expect(screen.getByLabelText("搜索")).toBeInTheDocument();
    expect(screen.getByLabelText("类型")).toBeInTheDocument();
    expect(screen.getByLabelText("状态")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByLabelText("状态"), { pointerType: "mouse" });
    fireEvent.mouseDown(screen.getByLabelText("状态"), { button: 0 });
    expect(await screen.findByRole("option", { name: "待同步" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "需复核" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "全部状态" }));
    fireEvent.pointerDown(screen.getByLabelText("排序"), { pointerType: "mouse" });
    fireEvent.mouseDown(screen.getByLabelText("排序"), { button: 0 });
    expect(await screen.findByRole("option", { name: "来源" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "类型" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "状态" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "技能" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "优先" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "来源" }));
    expect(screen.queryByText("启用仓库")).not.toBeInTheDocument();
    expect(screen.queryByText("已索引技能")).not.toBeInTheDocument();
    expect(screen.queryByText("需要复核")).not.toBeInTheDocument();
    const headerButtons = within(pageHeader as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(headerButtons).toEqual(["新增", "同步"]);
    expect(screen.getByRole("button", { name: "同步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "新增" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "强制重新扫描" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team skills repository" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("button", { name: "Team skills repository" }).textContent).toBe(
      "Team skills repository"
    );
    const sourceTable = within(screen.getByRole("main")).getByRole("table");
    const sourceTableBody = sourceTable.querySelector("[data-slot='table-body']");
    const sourceHeaderCells = within(sourceTable).getAllByRole("columnheader");
    const firstSourceRow = sourceTableBody?.querySelector("tr");
    const sourceBodyCells = within(firstSourceRow as HTMLElement).getAllByRole("cell");

    expect(sourceTable.closest("section")).toHaveClass("flex-1", "min-h-0", "overflow-hidden");
    expect(sourceTableBody).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    expect(sourceTableBody).toContainElement(
      screen.getByRole("button", { name: "Team skills repository" })
    );
    expect(sourceHeaderCells[0]).toHaveClass("w-10");
    expect(sourceBodyCells[0]).toHaveClass("w-10");
    expect(sourceHeaderCells[2]).toHaveClass("w-24");
    expect(sourceBodyCells[2]).toHaveClass("w-24");
    expect(sourceHeaderCells[3]).toHaveClass("w-24");
    expect(sourceBodyCells[3]).toHaveClass("w-24");
    expect(sourceHeaderCells[4]).toHaveClass("w-14");
    expect(sourceBodyCells[4]).toHaveClass("w-14");
    expect(sourceHeaderCells[5]).toHaveClass("w-12");
    expect(sourceBodyCells[5]).toHaveClass("w-12");
    expect(sourceHeaderCells[6]).toHaveClass("w-16");
    expect(sourceBodyCells[6]).toHaveClass("w-16");
    expect(
      within(sourceTableBody as HTMLElement).queryByText("git@github.com:team/skills.git")
    ).not.toBeInTheDocument();
    expect(within(sourceTable).getByRole("columnheader", { name: "来源" })).toBeInTheDocument();
    expect(sourceTableBody).not.toContainElement(
      within(sourceTable).getByRole("columnheader", { name: "来源" })
    );
    expect(within(sourceTable).getByRole("columnheader", { name: "类型" })).toBeInTheDocument();
    expect(within(sourceTable).getByRole("columnheader", { name: "状态" })).toBeInTheDocument();
    expect(within(sourceTable).getByRole("columnheader", { name: "技能" })).toBeInTheDocument();
    expect(within(sourceTable).getByRole("columnheader", { name: "启用" })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryByText("分支")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryByText("main")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).getAllByText("就绪").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("main")).queryByText("ready")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team skills repository" })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("来源详情")).getByRole("button", { name: "编辑" })
    ).toBeInTheDocument();
    const deleteButton = within(screen.getByLabelText("来源详情")).getByRole("button", {
      name: "删除"
    });
    expect(deleteButton.querySelector("svg")).toBeNull();
    expect(screen.getByText("同步影响")).toBeInTheDocument();
    expect(within(screen.getByLabelText("来源详情")).getByText("新增技能")).toBeInTheDocument();
    expect(within(screen.getByLabelText("来源详情")).getByText("移除技能")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("来源详情")).queryByText("新增 skill unit")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("来源详情")).queryByText("移除 skill unit")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("来源详情")).queryByText("元数据变更")
    ).not.toBeInTheDocument();
  });

  it("filters sources by provider and status", async () => {
    await renderRepositoriesPage();

    await selectOption("类型", "Local");
    expect(screen.getByRole("button", { name: "Local development skills" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Team skills repository" })
    ).not.toBeInTheDocument();

    await selectOption("状态", "需复核");
    expect(screen.getByText("没有匹配的来源。调整搜索或筛选条件。")).toBeInTheDocument();
  });

  it("only offers GitHub and Local in the provider filter", async () => {
    await renderRepositoriesPage();

    fireEvent.pointerDown(screen.getByLabelText("类型"), { pointerType: "mouse" });
    fireEvent.mouseDown(screen.getByLabelText("类型"), { button: 0 });

    await expectOnlyGitHubAndLocalProviderOptions();
  });

  it("paginates large source lists after sorting and limits select-all to the current page", async () => {
    window.skillsManager = {
      listRepositories: vi
        .fn()
        .mockResolvedValue({ repositories: createPagedRepositoryRecords(25) })
    } as unknown as NonNullable<typeof window.skillsManager>;

    await renderRepositoriesPage("zh-CN", "Paged Source 01");

    expect(screen.getByRole("button", { name: "Paged Source 20" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Source 21" })).not.toBeInTheDocument();
    expect(screen.getByText("1-20 / 25")).toBeInTheDocument();
    const sourceTable = within(screen.getByRole("main")).getByRole("table");
    const tableBody = sourceTable.querySelector("[data-slot='table-body']");
    const paginationFooter = screen.getByText("1-20 / 25").closest("tfoot");

    expect(paginationFooter).not.toBeNull();
    expect(tableBody).not.toContainElement(paginationFooter as HTMLElement);
    expect(paginationFooter).toHaveClass("shrink-0");

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));

    expect(await screen.findByRole("button", { name: "Paged Source 21" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Source 25" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Source 20" })).not.toBeInTheDocument();
    expect(screen.getByText("21-25 / 25")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择全部可见来源"));

    expect(screen.getByLabelText("选择 Paged Source 21")).toBeChecked();
    expect(screen.getByLabelText("选择 Paged Source 25")).toBeChecked();

    fireEvent.click(screen.getByRole("link", { name: "上一页" }));

    expect(await screen.findByRole("button", { name: "Paged Source 01" })).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Paged Source 01")).not.toBeChecked();

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));
    expect(await screen.findByText("21-25 / 25")).toBeInTheDocument();

    await selectOption("排序", "技能");

    expect(await screen.findByText("1-20 / 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Source 25" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Source 05" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索"), { target: { value: "Paged Source 25" } });

    expect(await screen.findByRole("button", { name: "Paged Source 25" })).toBeInTheDocument();
    expect(screen.getByText("1-1 / 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Source 01" })).not.toBeInTheDocument();
  }, 10000);

  it("searches sources by name, URL, or note", async () => {
    await renderRepositoriesPage();

    const searchField = screen.getByLabelText("搜索");

    expect(searchField).toHaveAttribute("placeholder", "搜索名称、URL 或备注");

    fireEvent.change(searchField, { target: { value: "stable" } });
    expect(screen.getByText("没有匹配的来源。调整搜索或筛选条件。")).toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "gitlab.com:design" } });
    expect(screen.getByRole("button", { name: "Design lab prompts" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Team skills repository" })
    ).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "系统 Git 凭据" } });
    expect(screen.getByRole("button", { name: "Team skills repository" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Design lab prompts" })).not.toBeInTheDocument();
  });

  it("updates the detail pane when a source row is selected", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "Local development skills" }));

    const detail = screen.getByLabelText("来源详情");
    expect(
      within(detail).getByRole("heading", { name: "Local development skills" })
    ).toBeInTheDocument();
    expect(within(detail).getAllByText("D:/workspace/local-skills").length).toBeGreaterThan(0);
    expect(within(detail).getByText("开发中的本机仓库，不需要 clone。")).toBeInTheDocument();
    expect(
      within(detail).getByText("agents/skills/*/SKILL.md, skills/*/SKILL.md")
    ).toBeInTheDocument();
    expect(within(detail).getByText("Local")).toBeInTheDocument();
    expect(within(detail).queryByText("分支")).not.toBeInTheDocument();
    expect(within(detail).queryByText("最后 commit")).not.toBeInTheDocument();
    expect(within(detail).queryByText("缓存目录")).not.toBeInTheDocument();
    expect(within(detail).queryByText("扫描警告")).not.toBeInTheDocument();
    expect(within(detail).getAllByText("2026/04/28 08:00").length).toBeGreaterThan(0);
    expect(within(detail).getByText("是")).toBeInTheDocument();
  });

  it("shows detailed last sync skill changes after clicking a sync impact tile", async () => {
    window.skillsManager = {
      listRepositories: vi.fn().mockResolvedValue({
        repositories: [
          {
            ...repositoryApiRecordsFixture[0],
            configJson: JSON.stringify({
              enabled: true,
              lastScanLabel: "已同步",
              note: "团队共享技能来源，使用系统 Git 凭据读取。",
              patterns: ["skills/*/SKILL.md"],
              priority: 1,
              providerName: "GitHub",
              scan: { added: 1, changed: 1, removed: 0, warnings: 1 },
              skillUnits: 12,
              status: "ready"
            }),
            lastSync: {
              ...repositoryApiRecordsFixture[0].lastSync!,
              summaryJson: JSON.stringify({
                distribution: {
                  autoDistributionEnabled: true,
                  blocked: 0,
                  conflicts: 1,
                  eligible: 2,
                  failed: 0,
                  installed: 1,
                  skipped: 0,
                  updated: 1
                },
                scan: {
                  added: [
                    {
                      commitSha: "8f2c91a",
                      name: "Review Bot",
                      skillKey: "skills-review-bot",
                      skillUnitId: "team-skills__skills-review-bot"
                    }
                  ],
                  changed: [
                    {
                      commitSha: "8f2c91a",
                      name: "Design Helper",
                      previousCommitSha: "21ab9d0",
                      skillKey: "design-helper",
                      skillUnitId: "team-skills__design-helper"
                    }
                  ],
                  counts: { added: 1, changed: 1, removed: 0, warnings: 1 },
                  removed: [],
                  warnings: ["Ignored duplicate skill id: design-helper"]
                }
              })
            }
          }
        ]
      })
    } as unknown as NonNullable<typeof window.skillsManager>;

    await renderRepositoriesPage();

    const detail = screen.getByLabelText("来源详情");
    const distributionSection = within(detail)
      .getByRole("heading", { name: "分发摘要" })
      .closest("section") as HTMLElement;
    const addedTile = within(detail).getByRole("button", { name: /新增技能/ });
    const changedTile = within(detail).getByRole("button", { name: /变更技能/ });

    expect(addedTile.querySelector("svg")).not.toBeNull();
    expect(changedTile.querySelector("svg")).not.toBeNull();
    expect(within(detail).queryByRole("button", { name: /移除技能/ })).not.toBeInTheDocument();
    const removedTile = within(detail).getByText("移除技能").closest("div");

    expect(removedTile).not.toContainElement(screen.queryByText("Legacy Helper"));
    expect(removedTile?.querySelector("svg")).not.toBeNull();
    expect(distributionSection).not.toBeNull();
    expect(within(detail).queryByRole("heading", { name: "同步明细" })).not.toBeInTheDocument();
    expect(within(detail).queryByText("Review Bot")).not.toBeInTheDocument();
    expect(within(detail).queryByText("Design Helper")).not.toBeInTheDocument();
    expect(within(detail).queryByText("Legacy Helper")).not.toBeInTheDocument();

    fireEvent.click(changedTile);

    const controlledPanelId = changedTile.getAttribute("aria-controls");
    const syncDetailsPanel = document.getElementById(controlledPanelId as string);
    const changedTileBox = changedTile.closest(
      "[data-sync-impact-item='changed']"
    ) as HTMLElement | null;

    expect(controlledPanelId).toBeTruthy();
    expect(syncDetailsPanel).not.toBeNull();
    expect(changedTileBox).not.toBeNull();
    expect(changedTileBox).toContainElement(syncDetailsPanel);
    expect(changedTileBox).toHaveClass("rounded-lg", "border", "border-border", "bg-muted/40");
    expect(changedTile).not.toHaveClass("border");
    expect(syncDetailsPanel?.querySelector(".border-l-2")).toBeNull();
    expect(within(syncDetailsPanel as HTMLElement).queryByText("同步明细")).not.toBeInTheDocument();
    expect(within(syncDetailsPanel as HTMLElement).queryByText("变更技能")).not.toBeInTheDocument();
    expect(within(syncDetailsPanel as HTMLElement).getByText("Design Helper")).toBeInTheDocument();
    expect(
      within(syncDetailsPanel as HTMLElement).queryByText("design-helper")
    ).not.toBeInTheDocument();
    expect(within(syncDetailsPanel as HTMLElement).queryByText("新增技能")).not.toBeInTheDocument();
    expect(
      within(syncDetailsPanel as HTMLElement).queryByText("Review Bot")
    ).not.toBeInTheDocument();
    expect(within(syncDetailsPanel as HTMLElement).queryByText("移除技能")).not.toBeInTheDocument();
    expect(
      within(syncDetailsPanel as HTMLElement).queryByText("Legacy Helper")
    ).not.toBeInTheDocument();
    expect(
      within(syncDetailsPanel as HTMLElement).queryByText(
        "Ignored duplicate skill id: design-helper"
      )
    ).not.toBeInTheDocument();

    fireEvent.click(changedTile);

    expect(within(detail).queryByText("Design Helper")).not.toBeInTheDocument();

    fireEvent.click(addedTile);

    const addedPanelId = addedTile.getAttribute("aria-controls");
    const addedDetailsPanel = document.getElementById(addedPanelId as string);

    expect(addedPanelId).toBeTruthy();
    expect(addedDetailsPanel).not.toBeNull();
    expect(
      within(addedDetailsPanel as HTMLElement).queryByText("新增技能")
    ).not.toBeInTheDocument();
    expect(within(addedDetailsPanel as HTMLElement).getByText("Review Bot")).toBeInTheDocument();
    expect(
      within(addedDetailsPanel as HTMLElement).queryByText("skills-review-bot")
    ).not.toBeInTheDocument();
    expect(
      within(addedDetailsPanel as HTMLElement).queryByText("变更技能")
    ).not.toBeInTheDocument();
    expect(
      within(addedDetailsPanel as HTMLElement).queryByText("Design Helper")
    ).not.toBeInTheDocument();
    expect(within(distributionSection).getByText("自动分发")).toBeInTheDocument();
    expect(within(distributionSection).getByText("已开启")).toBeInTheDocument();
    expect(within(distributionSection).getByText("可分发")).toBeInTheDocument();
    expect(within(distributionSection).getByText("冲突")).toBeInTheDocument();
  });

  it("selects a source when clicking a non-interactive row cell", async () => {
    await renderRepositoriesPage();

    fireEvent.click(within(screen.getByRole("main")).getByText("GitLab"));

    expect(screen.getByRole("heading", { name: "Design lab prompts" })).toBeInTheDocument();
  });

  it("hides cache and warning details and formats enabled state for remote sources", async () => {
    await renderRepositoriesPage();

    const detail = screen.getByLabelText("来源详情");

    expect(within(detail).queryByText("缓存目录")).not.toBeInTheDocument();
    expect(within(detail).queryByText("扫描警告")).not.toBeInTheDocument();
    expect(within(detail).getByText("分支")).toBeInTheDocument();
    expect(within(detail).getByText("最后 commit")).toBeInTheDocument();
    expect(within(detail).getAllByText("2026/04/28 08:00").length).toBeGreaterThan(0);
    expect(within(detail).getByText("是")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "skills.sh market index" }));

    expect(within(detail).getByText("否")).toBeInTheDocument();
  });

  it("opens the selected source URL or path from the detail pane", async () => {
    const openRepositoryLocation = vi.fn().mockResolvedValue(undefined);

    window.skillsManager = {
      getHealth: vi.fn().mockResolvedValue({
        chrome: "130.0.0",
        electron: "42.2.0",
        node: "25.0.0",
        platform: "win32"
      }),
      getInfo: vi.fn().mockResolvedValue({ version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      openRepositoryLocation,
      platform: "win32"
    };
    await renderRepositoriesPage();

    const detail = screen.getByLabelText("来源详情");

    fireEvent.click(
      within(detail).getByRole("button", { name: "打开 git@github.com:team/skills.git" })
    );
    expect(openRepositoryLocation).toHaveBeenCalledWith("git@github.com:team/skills.git");

    fireEvent.click(screen.getByRole("button", { name: "Local development skills" }));
    fireEvent.click(within(detail).getByRole("button", { name: "打开 D:/workspace/local-skills" }));

    expect(openRepositoryLocation).toHaveBeenLastCalledWith("D:/workspace/local-skills");
  });

  it("enables sync after a source is checked", async () => {
    await renderRepositoriesPage();

    const syncButton = screen.getByRole("button", { name: "同步" });
    expect(syncButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText("选择 Design lab prompts"));
    expect(syncButton).toBeEnabled();
  });

  it("confirms local source copy with a Base UI dialog before syncing checked local paths", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    const dialog = await screen.findByRole("alertdialog", { name: "本地路径同步确认" });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(syncRepositories).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText(
        "本地路径同步会复制文件到 Skills Manager 的统一本地缓存目录。旧地址的文件需要用户手动删除。是否继续？"
      )
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "确定" }));

    await waitFor(() => expect(syncRepositories).toHaveBeenCalledWith(["local-dev-skills"]));
    expect(listRepositories).toHaveBeenCalledTimes(2);

    confirmSpy.mockRestore();
  });

  it("cancels local source sync from the Base UI confirmation dialog", async () => {
    const syncRepositories = vi.fn().mockResolvedValue({
      results: []
    });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));

    const dialog = await screen.findByRole("alertdialog", { name: "本地路径同步确认" });
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));

    expect(screen.queryByRole("alertdialog", { name: "本地路径同步确认" })).not.toBeInTheDocument();
    expect(syncRepositories).not.toHaveBeenCalled();
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(getRepositorySyncButton("Team skills repository"));

    await waitFor(() => expect(syncRepositories).toHaveBeenCalledWith(["team-skills"]));
    expect(listRepositories).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByLabelText(
        "Team skills repository 同步完成。已入库 12 个 Skills。新增 0，更新 1，移除 0，警告 0。"
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Team skills repository")).not.toBeChecked();
  });

  it("shows the last persisted sync status on the row sync icon", async () => {
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({
        repositories: repositoryApiRecordsFixture.map((repository) =>
          repository.id === "team-skills"
            ? {
                ...repository,
                lastSync: {
                  errorMessage: "没有权限访问这个 Git 来源。",
                  finishedAt: "2026-06-08T02:00:00.000Z",
                  status: "failed"
                }
              }
            : repository
        )
      }),
      platform: "win32"
    };
    await renderRepositoriesPage();

    expect(
      screen.getByLabelText("Team skills repository 最后一次同步失败。没有权限访问这个 Git 来源。")
    ).toBeInTheDocument();
  });

  it("shows an animated per-source sync indicator while a source is syncing", async () => {
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog", { name: "本地路径同步确认" })).getByRole(
        "button",
        {
          name: "确定"
        }
      )
    );

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
  });

  it("shows per-skill sync progress and closes the progress dialog after completion", async () => {
    let progressCallback: RepositorySyncProgressCallback = () => undefined;
    let resolveSync: (value: RepositoriesSyncResult) => void = () => undefined;
    const syncRepositories = vi.fn(
      () =>
        new Promise<RepositoriesSyncResult>((resolve) => {
          resolveSync = resolve;
        })
    );
    const onRepositorySyncProgress = vi.fn((callback: RepositorySyncProgressCallback) => {
      progressCallback = callback;
      return vi.fn();
    });
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      onRepositorySyncProgress,
      platform: "win32",
      syncRepositories
    } as unknown as NonNullable<typeof window.skillsManager>;
    await renderRepositoriesPage();

    fireEvent.click(getRepositorySyncButton("Team skills repository"));
    await waitFor(() => expect(syncRepositories).toHaveBeenCalledWith(["team-skills"]));
    vi.useFakeTimers();

    act(() => {
      progressCallback({
        repositoryId: "team-skills",
        repositoryName: "Team skills repository",
        skill: {
          name: "Review Bot",
          skillKey: "review-bot",
          skillUnitId: "team-skills__review-bot"
        },
        status: "syncing"
      });
      progressCallback({
        repositoryId: "team-skills",
        repositoryName: "Team skills repository",
        skill: {
          name: "Design Helper",
          skillKey: "design-helper",
          skillUnitId: "team-skills__design-helper"
        },
        status: "syncing"
      });
    });

    const dialog = screen.getByRole("dialog", { name: "同步进度" });
    const reviewRow = within(dialog).getByText("Review Bot").closest("li") as HTMLElement;
    const designRow = within(dialog).getByText("Design Helper").closest("li") as HTMLElement;

    expect(within(reviewRow).getByLabelText("Review Bot 同步中").querySelector("svg")).toHaveClass(
      "animate-spin"
    );
    expect(
      within(designRow).getByLabelText("Design Helper 同步中").querySelector("svg")
    ).toHaveClass("animate-spin");

    act(() => {
      progressCallback({
        repositoryId: "team-skills",
        repositoryName: "Team skills repository",
        skill: {
          name: "Review Bot",
          skillKey: "review-bot",
          skillUnitId: "team-skills__review-bot"
        },
        status: "completed"
      });
    });

    expect(within(reviewRow).getByLabelText("Review Bot 同步中").querySelector("svg")).toHaveClass(
      "animate-spin"
    );
    expect(
      within(designRow).getByLabelText("Design Helper 同步中").querySelector("svg")
    ).toHaveClass("animate-spin");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      within(reviewRow).getByLabelText("Review Bot 完成").querySelector("svg")
    ).not.toHaveClass("animate-spin");
    expect(
      within(designRow).getByLabelText("Design Helper 同步中").querySelector("svg")
    ).toHaveClass("animate-spin");

    await act(async () => {
      progressCallback({
        repositoryId: "team-skills",
        repositoryName: "Team skills repository",
        skill: {
          name: "Design Helper",
          skillKey: "design-helper",
          skillUnitId: "team-skills__design-helper"
        },
        status: "completed"
      });
      resolveSync({
        results: [
          {
            commitSha: "8f2c91a",
            repositoryId: "team-skills",
            scan: { added: 1, changed: 1, removed: 0, warnings: 0 },
            skillUnits: 12,
            status: "ready"
          }
        ]
      });
    });

    expect(within(dialog).getByText("同步完成。")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole("dialog", { name: "同步进度" })).not.toBeInTheDocument();
  }, 10000);

  it("keeps a completed skill loader spinning for at least one second", async () => {
    let progressCallback: RepositorySyncProgressCallback = () => undefined;
    const syncRepositories = vi.fn(
      () =>
        new Promise<RepositoriesSyncResult>(() => {
          // Keep the repository sync open so the test only exercises per-item progress timing.
        })
    );
    const onRepositorySyncProgress = vi.fn((callback: RepositorySyncProgressCallback) => {
      progressCallback = callback;
      return vi.fn();
    });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      onRepositorySyncProgress,
      platform: "win32",
      syncRepositories
    } as unknown as NonNullable<typeof window.skillsManager>;
    await renderRepositoriesPage();

    fireEvent.click(getRepositorySyncButton("Team skills repository"));
    await waitFor(() => expect(syncRepositories).toHaveBeenCalledWith(["team-skills"]));
    vi.useFakeTimers();

    act(() => {
      progressCallback({
        repositoryId: "team-skills",
        repositoryName: "Team skills repository",
        skill: {
          name: "Review Bot",
          skillKey: "review-bot",
          skillUnitId: "team-skills__review-bot"
        },
        status: "syncing"
      });
    });

    const dialog = screen.getByRole("dialog", { name: "同步进度" });
    const reviewRow = within(dialog).getByText("Review Bot").closest("li") as HTMLElement;

    act(() => {
      progressCallback({
        repositoryId: "team-skills",
        repositoryName: "Team skills repository",
        skill: {
          name: "Review Bot",
          skillKey: "review-bot",
          skillUnitId: "team-skills__review-bot"
        },
        status: "completed"
      });
    });

    expect(within(reviewRow).getByLabelText("Review Bot 同步中").querySelector("svg")).toHaveClass(
      "animate-spin"
    );

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(within(reviewRow).getByLabelText("Review Bot 同步中").querySelector("svg")).toHaveClass(
      "animate-spin"
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(
      within(reviewRow).getByLabelText("Review Bot 完成").querySelector("svg")
    ).not.toHaveClass("animate-spin");
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(getRepositorySyncButton("Team skills repository"));
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
        "Design lab prompts 同步完成。已入库 7 个 Skills。新增 0，更新 1，移除 0，警告 0。"
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog", { name: "本地路径同步确认" })).getByRole(
        "button",
        {
          name: "确定"
        }
      )
    );

    expect(
      await screen.findByLabelText(
        "Local development skills 同步完成。已入库 1 个 Skills。新增 1，更新 0，移除 0，警告 0。"
      )
    ).toBeInTheDocument();
  });

  it("keeps a failed per-source sync indicator with the error message", async () => {
    const syncRepositories = vi.fn().mockRejectedValue(new Error("Permission denied"));

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      syncRepositories
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByLabelText("选择 Local development skills"));
    fireEvent.click(screen.getByRole("button", { name: "同步" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog", { name: "本地路径同步确认" })).getByRole(
        "button",
        {
          name: "确定"
        }
      )
    );

    expect(
      await screen.findByLabelText("Local development skills 同步失败。Permission denied")
    ).toBeInTheDocument();
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
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
    const updateRepository = vi.fn().mockResolvedValue({
      ...repositoryApiRecordsFixture[3],
      configJson: JSON.stringify({
        enabled: true,
        lastScanLabel: "未执行",
        note: "市场索引默认休眠，启用后进入同步队列。",
        patterns: ["market-index.json"],
        priority: 6,
        providerName: "skills.sh",
        scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
        skillUnits: 0,
        status: "review"
      })
    });
    const updatedRepositories = repositoryApiRecordsFixture.map((repository) =>
      repository.id === "market-index"
        ? {
            ...repository,
            configJson: JSON.stringify({
              enabled: true,
              lastScanLabel: "未执行",
              note: "市场索引默认休眠，启用后进入同步队列。",
              patterns: ["market-index.json"],
              priority: 6,
              providerName: "skills.sh",
              scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
              skillUnits: 0,
              status: "review"
            })
          }
        : repository
    );
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({ repositories: updatedRepositories });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32",
      updateRepository
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "skills.sh market index" }));
    const switchControl = screen.getByRole("switch", { name: "启用 skills.sh market index" });
    expect(switchControl).toHaveAttribute("aria-checked", "false");

    fireEvent.click(switchControl);
    await waitFor(() =>
      expect(updateRepository).toHaveBeenCalledWith("market-index", {
        branch: "index",
        enabled: true,
        name: "skills.sh market index",
        note: "市场索引默认休眠，启用后进入同步队列。",
        patterns: "market-index.json",
        provider: "skills.sh",
        remoteUrl: "https://skills.sh"
      })
    );
    expect(listRepositories).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole("switch", { name: "启用 skills.sh market index" })
    ).toHaveAttribute("aria-checked", "true");
    expect(within(screen.getByLabelText("来源详情")).getByText("是")).toBeInTheDocument();
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
        status: "pending"
      }),
      id: "repo-huashu-design",
      lastSync: null,
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
              status: "pending"
            }),
            id: "repo-huashu-design",
            lastSync: null,
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32"
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    const remoteUrlField = within(dialog).getByLabelText("URL / 本机路径");
    const browseButton = within(dialog).getByRole("button", { name: "浏览" });
    const nameField = within(dialog).getByLabelText("名称");
    const providerField = within(dialog).getByLabelText("来源类型");
    const branchField = within(dialog).getByLabelText("分支");
    const patternsField = within(dialog).getByLabelText("发现入口");
    expect(remoteUrlField).toHaveClass("h-10");
    expect(browseButton).toHaveClass("h-10");
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
    expect(patternsField).toHaveAttribute(
      "placeholder",
      "例: **/SKILL.md、skills/*/SKILL.md 或 SKILL.md"
    );
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
    expect(screen.getByText("待同步")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "huashu-design" })).toBeInTheDocument();
  });

  it("persists edits from the source modal form", async () => {
    const updateRepository = vi.fn().mockResolvedValue({
      branch: "",
      configJson: JSON.stringify({
        enabled: true,
        lastScanLabel: "未执行",
        note: "迁移到 GitLab 后继续手动同步。",
        patterns: ["skills/*/SKILL.md", "template/SKILL.md"],
        priority: 1,
        providerName: "GitHub",
        scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
        skillUnits: 12,
        status: "ready"
      }),
      id: "team-skills",
      lastSync: null,
      lastScannedCommitSha: "8f2c91a",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills edited",
      providerId: "github",
      remoteUrl: "git@gitlab.com:design/lab-skills.git",
      updatedAt: "2026-06-12T00:00:00.000Z"
    });
    const updatedRepositories = repositoryApiRecordsFixture.map((repository) =>
      repository.id === "team-skills"
        ? {
            ...repository,
            branch: "",
            configJson: JSON.stringify({
              enabled: true,
              lastScanLabel: "未执行",
              note: "迁移到 GitLab 后继续手动同步。",
              patterns: ["skills/*/SKILL.md", "template/SKILL.md"],
              priority: 1,
              providerName: "GitHub",
              scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
              skillUnits: 12,
              status: "ready"
            }),
            name: "Team skills edited",
            providerId: "github",
            remoteUrl: "git@gitlab.com:design/lab-skills.git"
          }
        : repository
    );
    const listRepositories = vi
      .fn()
      .mockResolvedValueOnce({ repositories: repositoryApiRecordsFixture })
      .mockResolvedValueOnce({ repositories: updatedRepositories });

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories,
      platform: "win32",
      updateRepository
    };
    await renderRepositoriesPage();

    fireEvent.click(
      within(screen.getByLabelText("来源详情")).getByRole("button", { name: "编辑" })
    );
    const dialog = screen.getByRole("dialog", { name: "编辑来源" });
    fireEvent.change(within(dialog).getByLabelText("名称"), {
      target: { value: "Team skills edited" }
    });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "git@gitlab.com:design/lab-skills.git" }
    });
    fireEvent.change(within(dialog).getByLabelText("分支"), {
      target: { value: "" }
    });
    fireEvent.change(within(dialog).getByLabelText("发现入口"), {
      target: { value: "skills/*/SKILL.md, template/SKILL.md" }
    });
    fireEvent.change(within(dialog).getByLabelText("备注"), {
      target: { value: "迁移到 GitLab 后继续手动同步。" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "保存来源" }));

    await waitFor(() =>
      expect(updateRepository).toHaveBeenCalledWith("team-skills", {
        branch: "",
        name: "Team skills edited",
        note: "迁移到 GitLab 后继续手动同步。",
        patterns: "skills/*/SKILL.md, template/SKILL.md",
        provider: "GitHub",
        remoteUrl: "git@gitlab.com:design/lab-skills.git"
      })
    );
    expect(listRepositories).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "Team skills edited" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("heading", { name: "Team skills edited" })).toBeInTheDocument();
  });

  it("only offers GitHub and Local when adding a source", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    fireEvent.click(within(dialog).getByLabelText("来源类型"));

    await expectOnlyGitHubAndLocalProviderOptions();
  });

  it("only offers GitHub and Local when editing a source", async () => {
    await renderRepositoriesPage();

    fireEvent.click(
      within(screen.getByLabelText("来源详情")).getByRole("button", { name: "编辑" })
    );
    const dialog = screen.getByRole("dialog", { name: "编辑来源" });
    fireEvent.click(within(dialog).getByLabelText("来源类型"));

    await expectOnlyGitHubAndLocalProviderOptions();
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
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
      patterns: ["skills/*/SKILL.md", "template/SKILL.md"],
      provider: "GitHub"
    });
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
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
    expect(within(dialog).getByLabelText("发现入口")).toHaveValue(
      "skills/*/SKILL.md, template/SKILL.md"
    );
    expect(within(dialog).getByLabelText("备注")).toHaveValue(
      "Composable Claude skills from Anthropic."
    );
    expect(inspectRepositorySource).toHaveBeenCalledWith("https://github.com/anthropics/skills");
  });

  it("browses a local source directory and inspects it as a local path", async () => {
    const localPath = "D:\\workspace\\local-skills";
    const inspectRepositorySource = vi.fn().mockResolvedValue({
      name: "local-skills",
      patterns: ["skills/*/SKILL.md"],
      provider: "Local"
    });
    const selectLocalRepositoryPath = vi.fn().mockResolvedValue(localPath);
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      inspectRepositorySource,
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      selectLocalRepositoryPath
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    fireEvent.click(within(dialog).getByRole("button", { name: "浏览" }));

    expect(selectLocalRepositoryPath).toHaveBeenCalled();
    expect(await within(dialog).findByDisplayValue(localPath)).toBeInTheDocument();
    expect(await within(dialog).findByDisplayValue("local-skills")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("来源类型")).toHaveTextContent("Local");
    expect(within(dialog).getByLabelText("分支")).toHaveValue("");
    expect(within(dialog).getByLabelText("备注")).toHaveValue("");
    expect(within(dialog).getByLabelText("发现入口")).toHaveValue("skills/*/SKILL.md");
    expect(inspectRepositorySource).toHaveBeenCalledWith(localPath);
  });

  it("creates a browsed local source with empty branch and note defaults", async () => {
    const localPath = "D:\\workspace\\local-skills";
    const createRepository = vi.fn().mockResolvedValue({
      branch: "",
      configJson: JSON.stringify({
        enabled: true,
        lastScanLabel: "未执行",
        note: "",
        patterns: ["skills/*/SKILL.md"],
        priority: 99,
        providerName: "Local",
        scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
        skillUnits: 0,
        status: "pending"
      }),
      id: "repo-local-skills",
      lastSync: null,
      lastScannedCommitSha: null,
      localCachePath: "~/.skills-manager/cache/local-skills",
      name: "local-skills",
      providerId: "local-git",
      remoteUrl: localPath,
      updatedAt: "2026-06-12T00:00:00.000Z"
    });
    const inspectRepositorySource = vi.fn().mockResolvedValue({
      name: "local-skills",
      patterns: ["skills/*/SKILL.md"],
      provider: "Local"
    });
    const selectLocalRepositoryPath = vi.fn().mockResolvedValue(localPath);

    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      createRepository,
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      inspectRepositorySource,
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      platform: "win32",
      selectLocalRepositoryPath
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    fireEvent.click(within(dialog).getByRole("button", { name: "浏览" }));
    await within(dialog).findByDisplayValue(localPath);
    expect(await within(dialog).findByDisplayValue("local-skills")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("分支")).toHaveValue("");
    expect(within(dialog).getByLabelText("备注")).toHaveValue("");
    fireEvent.click(within(dialog).getByRole("button", { name: "保存来源" }));

    await waitFor(() =>
      expect(createRepository).toHaveBeenCalledWith({
        branch: "",
        name: "local-skills",
        note: "",
        patterns: "skills/*/SKILL.md",
        provider: "Local",
        remoteUrl: localPath
      })
    );
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
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
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

  it("shows the returned network problem when source inspection fails", async () => {
    const networkError = "网络连接中断，暂时无法解析这个 GitHub 来源。请稍后重试。";
    const inspectRepositorySource = vi.fn().mockRejectedValue(new Error(networkError));
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
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

    expect(await within(dialog).findByText(networkError)).toBeInTheDocument();
    expect(inspectRepositorySource).toHaveBeenCalledWith("https://github.com/anthropics/skills");
  });

  it("shows GitHub token setup guidance when source inspection returns an API error", async () => {
    const apiError =
      "GitHub API 访问频率已达上限，请稍后重试。 请前往“设置 > 凭证管理”配置 GitHub Token 后重试。";
    const inspectRepositorySource = vi.fn().mockRejectedValue(new Error(apiError));
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ name: "Skills Manager", version: "0.1.0" }),
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

    expect(await within(dialog).findByText(apiError)).toBeInTheDocument();
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
