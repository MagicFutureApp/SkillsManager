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

const targetsWithSystemFixture: TargetsListResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-23T00:00:00.000Z",
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
    },
    ...targetsFixture.registeredTargets
  ]
};

const rescannedTargetsFixture: TargetsRescanResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-23T00:00:00.000Z",
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

const targetsWithNewCustomDirectoryFixture: TargetsListResult = {
  registeredTargets: [
    ...targetsFixture.registeredTargets,
    {
      createdAt: "2026-06-24T00:00:00.000Z",
      enabled: true,
      id: "target-custom-users-test-review-skills-16b7af9b49af",
      name: "review-skills",
      normalizedPath: "/Users/test/review-skills",
      path: "/Users/test/review-skills",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-24T00:00:00.000Z"
    }
  ]
};

const targetsForSortFixture: TargetsListResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-25T00:00:00.000Z",
      enabled: true,
      id: "target-alpha-independent",
      name: "Alpha independent",
      normalizedPath: "/Users/test/z-target",
      path: "/Users/test/z-target",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "independent",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-25T00:00:00.000Z"
    },
    {
      createdAt: "2026-06-25T00:00:00.000Z",
      enabled: true,
      id: "target-beta-global",
      name: "Beta global",
      normalizedPath: "/Users/test/m-target",
      path: "/Users/test/m-target",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-25T00:00:00.000Z"
    },
    {
      createdAt: "2026-06-25T00:00:00.000Z",
      enabled: true,
      id: "target-gamma-independent",
      name: "Gamma independent",
      normalizedPath: "/Users/test/a-target",
      path: "/Users/test/a-target",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "independent",
      status: "registered",
      type: "custom-directory",
      updatedAt: "2026-06-25T00:00:00.000Z"
    }
  ]
};

const createPagedTargetsFixture = (count: number): TargetsListResult => ({
  registeredTargets: Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      createdAt: "2026-06-25T00:00:00.000Z",
      enabled: true,
      id: `paged-target-${number}`,
      name: `Paged Target ${number}`,
      normalizedPath: `/Users/test/paged-target-${number}`,
      path: `/Users/test/paged-target-${number}`,
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: index + 1,
      scope: "global" as const,
      status: "registered" as const,
      type: "custom-directory",
      updatedAt: "2026-06-25T00:00:00.000Z"
    };
  })
});

const renderTargetsPage = async ({
  deletedTargets = {
    registeredTargets: [targetsFixture.registeredTargets[1]]
  },
  locale = "zh-CN",
  targets = targetsFixture
}: {
  deletedTargets?: TargetsListResult;
  locale?: "zh-CN" | "en-US";
  targets?: TargetsListResult;
} = {}) => {
  const i18n = await createI18nInstance(locale);

  window.skillsManager = {
    getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
    getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
    getLocale: vi.fn().mockResolvedValue(locale),
    listProviders: vi.fn().mockResolvedValue({ providers: [] }),
    listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
    listTargets: vi.fn().mockResolvedValue(targets),
    addCustomDirectoryTarget: vi.fn().mockResolvedValue(targetsWithNewCustomDirectoryFixture),
    deleteTargets: vi.fn().mockResolvedValue(deletedTargets),
    selectTargetDirectory: vi.fn().mockResolvedValue("/Users/test/review-skills"),
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

const openSelect = async (label: string) => {
  fireEvent.pointerDown(screen.getByLabelText(label), { pointerType: "mouse" });
  fireEvent.mouseDown(screen.getByLabelText(label), { button: 0 });

  return screen.findByRole("listbox");
};

const selectOption = async (label: string, optionName: string) => {
  const listbox = await openSelect(label);
  const option = within(listbox).getByRole("option", { name: optionName });

  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
};

describe("TargetsPage", () => {
  beforeEach(() => {
    window.skillsManager = undefined;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
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
    const headerButtons = within(pageHeader as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(headerButtons).toEqual(["新增", "重新扫描", "删除"]);
    const batchDeleteButton = within(pageHeader as HTMLElement).getByRole("button", {
      name: "删除"
    });
    expect(batchDeleteButton.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("button", { name: "新增目标" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /同步/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("目标摘要")).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Codex" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claude Code" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Local project" })).toBeInTheDocument();
    const targetTable = within(screen.getByRole("main")).getByRole("table");
    const targetTableBody = targetTable.querySelector("[data-slot='table-body']");

    expect(targetTable.closest("section")).toHaveClass("flex-1", "min-h-0", "overflow-hidden");
    expect(targetTableBody).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    expect(targetTableBody).toContainElement(screen.getByRole("button", { name: "Local project" }));
    expect(screen.getByRole("button", { name: "Local project" })).toHaveTextContent(
      "Local project"
    );
    expect(screen.getByRole("button", { name: "Local project" }).textContent).toBe("Local project");
    expect(
      within(targetTableBody as HTMLElement).queryByText("custom-directory")
    ).not.toBeInTheDocument();
    expect(within(targetTable).getByText("/Users/test/project/.codex/skills")).toBeInTheDocument();
    expect(within(targetTable).getByText("2 个技能")).toBeInTheDocument();
    const header = within(targetTable).getByRole("row", {
      name: "选择全部可删除目标 目标 路径 范围 技能 操作"
    });
    expect(targetTableBody).not.toContainElement(header);
    expect(within(header).getByText("目标")).toBeInTheDocument();
    expect(within(header).getByText("路径")).toBeInTheDocument();
    expect(within(header).getByText("范围")).toBeInTheDocument();
    expect(within(header).getByText("技能")).toBeInTheDocument();
    expect(within(header).getByText("操作")).toBeInTheDocument();
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
    const detailPath = within(detail).getByText("/Users/test/project/.codex/skills");

    expect(detailPath).toBeInTheDocument();
    expect(detailPath).toHaveClass("break-all");
    expect(detailPath).not.toHaveClass("truncate");
    fireEvent.click(within(detail).getByRole("button", { name: "复制目标" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/Users/test/project/.codex/skills");
    const identityCard = within(detail)
      .getByRole("heading", { name: "Local project" })
      .closest("section");
    const scanResultCard = within(detail)
      .getByRole("heading", { name: "扫描结果" })
      .closest("section");

    expect(identityCard).not.toBeNull();
    expect(scanResultCard).not.toBeNull();
    expect(
      within(identityCard as HTMLElement).queryByText("custom-directory")
    ).not.toBeInTheDocument();
    expect(within(identityCard as HTMLElement).queryByText("已登记")).not.toBeInTheDocument();
    expect(within(scanResultCard as HTMLElement).getByText("已登记")).toBeInTheDocument();
    expect(within(detail).queryByRole("heading", { name: "路径" })).not.toBeInTheDocument();
    expect(within(detail).queryByText("技能目录")).not.toBeInTheDocument();
    expect(within(detail).queryByText("安装目录")).not.toBeInTheDocument();
    expect(within(detail).queryByText("CLI 路径")).not.toBeInTheDocument();
  });

  it("labels the scan action as initial scan when no targets are registered", async () => {
    await renderTargetsPage({ targets: { registeredTargets: [] } });

    const pageHeading = await screen.findByRole("heading", { name: "目标管理" });
    const pageHeader = pageHeading.closest("header");

    expect(pageHeader).not.toBeNull();
    expect(
      within(pageHeader as HTMLElement).getByRole("button", { name: "扫描" })
    ).toBeInTheDocument();
    expect(
      within(pageHeader as HTMLElement).queryByRole("button", { name: "重新扫描" })
    ).not.toBeInTheDocument();
  });

  it("renders target identity in the detail header and scan status in the scan result block", async () => {
    await renderTargetsPage({ targets: targetsWithSystemFixture });

    await screen.findByRole("button", { name: "Codex" });

    const detail = screen.getByLabelText("目标详情");
    const heading = within(detail).getByRole("heading", { name: "Codex" });
    const identityCard = heading.closest("section");
    const scanResultHeading = within(detail).getByRole("heading", { name: "扫描结果" });
    const scanResultCard = scanResultHeading.closest("section");

    expect(identityCard).not.toBeNull();
    expect(scanResultCard).not.toBeNull();
    expect(
      within(identityCard as HTMLElement).getByText("/Users/test/.codex/skills")
    ).toBeInTheDocument();
    expect(within(identityCard as HTMLElement).queryByText("codex")).not.toBeInTheDocument();
    expect(within(identityCard as HTMLElement).queryByText("已检测")).not.toBeInTheDocument();
    expect(
      within(identityCard as HTMLElement).queryByRole("button", { name: "删除" })
    ).not.toBeInTheDocument();
    expect(within(scanResultCard as HTMLElement).getByText("已检测")).toBeInTheDocument();
    expect(
      within(scanResultCard as HTMLElement).getByText("Target directory exists and is writable.")
    ).toBeInTheDocument();
  });

  it("opens a confirmation dialog before deleting a single target", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });

    fireEvent.click(screen.getByRole("button", { name: "删除 Local project" }));

    const dialog = screen.getByRole("alertdialog", { name: "删除目标" });
    expect(within(dialog).getByText("Local project")).toHaveAttribute("title", "Local project");
    expect(within(dialog).getByText("/Users/test/project/.codex/skills")).toHaveAttribute(
      "title",
      "/Users/test/project/.codex/skills"
    );
    expect(
      within(dialog).getByText("目标目录里的 Skills 文件不会被删除。如有需要，请删除后手动清理。")
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(window.skillsManager?.deleteTargets).toHaveBeenCalledWith({
        targetIds: ["target-project"]
      });
    });
    expect(screen.queryByRole("button", { name: "Local project" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Design scratch" })).toBeInTheDocument();
  });

  it("opens the delete confirmation dialog from the target detail header", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });

    const detail = screen.getByLabelText("目标详情");

    fireEvent.click(within(detail).getByRole("button", { name: "删除" }));

    const dialog = screen.getByRole("alertdialog", { name: "删除目标" });
    expect(within(dialog).getByText("Local project")).toHaveAttribute("title", "Local project");
    expect(within(dialog).getByText("/Users/test/project/.codex/skills")).toHaveAttribute(
      "title",
      "/Users/test/project/.codex/skills"
    );
  });

  it("deletes selected targets in a batch after confirmation", async () => {
    await renderTargetsPage({ deletedTargets: { registeredTargets: [] } });
    await screen.findByRole("button", { name: "Local project" });

    fireEvent.click(screen.getByLabelText("选择 Local project"));
    fireEvent.click(screen.getByLabelText("选择 Design scratch"));

    const pageHeader = screen.getByRole("heading", { name: "目标管理" }).closest("header");
    expect(pageHeader).not.toBeNull();
    const batchDeleteButton = within(pageHeader as HTMLElement).getByRole("button", {
      name: "删除"
    });

    expect(batchDeleteButton).toBeEnabled();

    fireEvent.click(batchDeleteButton);

    const dialog = screen.getByRole("alertdialog", { name: "删除目标" });
    expect(within(dialog).getByText("将删除 2 个目标。")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(window.skillsManager?.deleteTargets).toHaveBeenCalledWith({
        targetIds: ["target-project", "target-design-only"]
      });
    });
    expect(screen.getByText("没有匹配的目标。调整搜索条件。")).toBeInTheDocument();
  });

  it("keeps built-in system targets unavailable for delete selection", async () => {
    await renderTargetsPage({ targets: targetsWithSystemFixture });

    await screen.findByRole("button", { name: "Codex" });

    expect(screen.queryByLabelText("选择 Codex")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除 Codex" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择全部可删除目标"));

    expect(screen.queryByLabelText("选择 Codex")).not.toBeInTheDocument();
    expect(screen.getByLabelText("选择 Local project")).toBeChecked();
    expect(screen.getByLabelText("选择 Design scratch")).toBeChecked();
  });

  it("does not search targets by type or status", async () => {
    await renderTargetsPage({
      targets: { registeredTargets: rescannedTargetsWithIssuesFixture.registeredTargets }
    });
    const searchField = await screen.findByLabelText("搜索目标");

    expect(searchField).toHaveAttribute("placeholder", "搜索名称、路径或已选择技能");

    fireEvent.change(searchField, { target: { value: "custom-directory" } });

    expect(screen.queryByRole("button", { name: "Local project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gemini CLI" })).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "not-writable" } });

    expect(screen.queryByRole("button", { name: "Local project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gemini CLI" })).not.toBeInTheDocument();
  });

  it("does not offer scan status as a target sort mode", async () => {
    await renderTargetsPage({ targets: targetsForSortFixture });
    await screen.findByRole("button", { name: "Alpha independent" });

    const listbox = await openSelect("排序");
    const sortOptions = within(listbox)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(sortOptions).toEqual(["名称", "路径", "范围", "技能"]);
    expect(within(listbox).queryByRole("option", { name: "状态" })).not.toBeInTheDocument();
  });

  it("sorts targets by path and scope when those sort modes are selected", async () => {
    await renderTargetsPage({ targets: targetsForSortFixture });
    await screen.findByRole("button", { name: "Alpha independent" });

    await selectOption("排序", "路径");

    let targetTable = within(screen.getByRole("main")).getByRole("table");
    let targetButtons = within(targetTable).getAllByRole("button", {
      name: /^(Alpha independent|Beta global|Gamma independent)$/
    });

    expect(targetButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Gamma independent",
      "Beta global",
      "Alpha independent"
    ]);

    await selectOption("排序", "范围");

    targetTable = within(screen.getByRole("main")).getByRole("table");
    targetButtons = within(targetTable).getAllByRole("button", {
      name: /^(Alpha independent|Beta global|Gamma independent)$/
    });

    expect(targetButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Beta global",
      "Alpha independent",
      "Gamma independent"
    ]);
  });

  it("paginates large target lists after sorting and limits select-all to the current page", async () => {
    await renderTargetsPage({ targets: createPagedTargetsFixture(25) });
    await screen.findByRole("button", { name: "Paged Target 01" });

    expect(screen.getByRole("button", { name: "Paged Target 20" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Target 21" })).not.toBeInTheDocument();
    expect(screen.getByText("1-20 / 25")).toBeInTheDocument();
    const targetTable = within(screen.getByRole("main")).getByRole("table");
    const tableBody = targetTable.querySelector("[data-slot='table-body']");
    const paginationFooter = screen.getByText("1-20 / 25").closest("tfoot");

    expect(paginationFooter).not.toBeNull();
    expect(tableBody).not.toContainElement(paginationFooter as HTMLElement);
    expect(paginationFooter).toHaveClass("shrink-0");

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));

    expect(await screen.findByRole("button", { name: "Paged Target 21" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Target 25" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Target 20" })).not.toBeInTheDocument();
    expect(screen.getByText("21-25 / 25")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择全部可删除目标"));

    expect(screen.getByLabelText("选择 Paged Target 21")).toBeChecked();
    expect(screen.getByLabelText("选择 Paged Target 25")).toBeChecked();

    fireEvent.click(screen.getByRole("link", { name: "上一页" }));

    expect(await screen.findByRole("button", { name: "Paged Target 01" })).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Paged Target 01")).not.toBeChecked();

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));
    expect(await screen.findByText("21-25 / 25")).toBeInTheDocument();

    await selectOption("排序", "路径");

    expect(await screen.findByText("1-20 / 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Target 01" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Target 21" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索目标"), {
      target: { value: "Paged Target 25" }
    });

    expect(await screen.findByRole("button", { name: "Paged Target 25" })).toBeInTheDocument();
    expect(screen.getByText("1-1 / 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Target 01" })).not.toBeInTheDocument();
  });

  it("keeps target table headers passive while the sort select controls order", async () => {
    await renderTargetsPage({ targets: targetsForSortFixture });
    await screen.findByRole("button", { name: "Alpha independent" });

    const targetTable = within(screen.getByRole("main")).getByRole("table");
    const nameHeader = within(targetTable).getByRole("columnheader", { name: "目标" });
    const pathHeader = within(targetTable).getByRole("columnheader", { name: "路径" });

    expect(nameHeader).not.toHaveAttribute("aria-sort");
    expect(pathHeader).not.toHaveAttribute("aria-sort");
    expect(within(pathHeader).queryByRole("button", { name: "路径" })).not.toBeInTheDocument();

    await selectOption("排序", "路径");

    const targetButtons = within(targetTable).getAllByRole("button", {
      name: /^(Alpha independent|Beta global|Gamma independent)$/
    });

    expect(targetButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Gamma independent",
      "Beta global",
      "Alpha independent"
    ]);
  });

  it("opens a directory picker and saves the selected path as a global target", async () => {
    await renderTargetsPage();
    await screen.findByRole("button", { name: "Local project" });

    fireEvent.click(screen.getByRole("button", { name: "新增" }));

    const dialog = screen.getByRole("dialog", { name: "新增目标" });

    expect(window.skillsManager?.selectTargetDirectory).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("本机路径")).toHaveAttribute("readonly");

    fireEvent.click(within(dialog).getByLabelText("本机路径"));

    expect(window.skillsManager?.selectTargetDirectory).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "浏览" }));

    await waitFor(() => {
      expect(window.skillsManager?.selectTargetDirectory).toHaveBeenCalledOnce();
      expect(within(dialog).getByLabelText("本机路径")).toHaveValue("/Users/test/review-skills");
      expect(within(dialog).getByLabelText("名称")).toHaveValue("review-skills");
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(window.skillsManager?.addCustomDirectoryTarget).toHaveBeenCalledWith({
        name: "review-skills",
        targetPath: "/Users/test/review-skills"
      });
      expect(screen.getByRole("button", { name: "review-skills" })).toBeInTheDocument();
    });
    expect(
      within(within(screen.getByRole("main")).getByRole("table")).getByText(
        "/Users/test/review-skills"
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("目标详情")).getByRole("heading", { name: "review-skills" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("全局").length).toBeGreaterThan(0);
  });

  it("does not save a target when directory selection is canceled", async () => {
    await renderTargetsPage();
    vi.mocked(window.skillsManager?.selectTargetDirectory!).mockResolvedValueOnce(null);
    await screen.findByRole("button", { name: "Local project" });

    fireEvent.click(screen.getByRole("button", { name: "新增" }));
    const dialog = screen.getByRole("dialog", { name: "新增目标" });

    fireEvent.click(within(dialog).getByRole("button", { name: "浏览" }));

    await waitFor(() => {
      expect(window.skillsManager?.selectTargetDirectory).toHaveBeenCalledOnce();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(window.skillsManager?.addCustomDirectoryTarget).not.toHaveBeenCalled();
    });
    expect(within(dialog).getByText("请填写名称和本机路径。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "review-skills" })).not.toBeInTheDocument();
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
