import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { PageLayout } from "@/components/layout/page-layout";
import { SkillsPage } from "./skills-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import { skillApiRecordsFixture } from "@/test/api-fixtures";
import type {
  DistributionExecuteResult,
  DistributionPreviewResult,
  TargetsListResult
} from "@/global";
import type { SkillApiRecord } from "../../../core/skills/skill-api";

const mockDescriptionOverflow = (overflowingText: string) => {
  const clientHeightSpy = vi
    .spyOn(HTMLElement.prototype, "clientHeight", "get")
    .mockImplementation(function clientHeight(this: HTMLElement) {
      return this.textContent === overflowingText ? 120 : 96;
    });
  const scrollHeightSpy = vi
    .spyOn(HTMLElement.prototype, "scrollHeight", "get")
    .mockImplementation(function scrollHeight(this: HTMLElement) {
      return this.textContent === overflowingText ? 180 : 96;
    });

  return () => {
    clientHeightSpy.mockRestore();
    scrollHeightSpy.mockRestore();
  };
};

const interactiveSkillRecordsFixture: SkillApiRecord[] = [
  ...skillApiRecordsFixture,
  {
    description: "Creates starter prompts for design reviews and product critique.",
    enabled: true,
    entry: "skills/design-helper/SKILL.md",
    id: "design-lab__design-helper",
    name: "Design Helper",
    repository: "Design lab prompts",
    repositoryId: "design-lab",
    skillId: "design-helper",
    status: "review",
    tags: ["design", "critique"],
    targets: ["codex"],
    version: "21ab9d0"
  },
  {
    description: "Installs release notes and changelog helpers.",
    enabled: false,
    entry: "skills/release-notes/SKILL.md",
    id: "local-dev-skills__release-notes",
    name: "Release Notes",
    repository: "Local development skills",
    repositoryId: "local-dev-skills",
    skillId: "release-notes",
    status: "installed",
    tags: ["release", "writing"],
    targets: ["codex", "claude"],
    version: "local"
  }
];

const createPagedSkillRecords = (count: number): SkillApiRecord[] =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      description: `Paged skill ${number} supports large catalog browsing.`,
      enabled: true,
      entry: `skills/paged-skill-${number}/SKILL.md`,
      id: `catalog__paged-skill-${number}`,
      name: `Paged Skill ${number}`,
      repository: "Large catalog",
      repositoryId: "catalog",
      skillId: `paged-skill-${number}`,
      status: "ready",
      tags: ["paged"],
      targets: [],
      version: "8f2c91a"
    };
  });

const skillTargetsFixture: TargetsListResult = {
  registeredTargets: [
    {
      createdAt: "2026-06-21T00:00:00.000Z",
      enabled: true,
      id: "codex",
      name: "Codex",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "registered",
      type: "codex",
      updatedAt: "2026-06-21T00:00:00.000Z"
    },
    {
      createdAt: "2026-06-21T00:00:00.000Z",
      enabled: true,
      id: "claude",
      name: "Claude Code",
      normalizedPath: "/Users/test/.claude/skills",
      path: "/Users/test/.claude/skills",
      scanMessage: null,
      selectedSkills: [],
      skillPreferences: [],
      skillCount: 0,
      scope: "global",
      status: "registered",
      type: "claude-code",
      updatedAt: "2026-06-21T00:00:00.000Z"
    }
  ]
};

const distributionPreviewFixture: DistributionPreviewResult = {
  createdAt: "2026-06-27T00:00:00.000Z",
  id: "preview-1",
  items: [
    {
      action: "install",
      agentTargetId: "codex",
      commitSha: "8f2c91abcdef",
      id: "preview-item-1",
      reason: "Skill is not installed on this target.",
      skillName: "Review Bot",
      skillUnitId: "team-skills__skills-review-bot",
      skillVersionId: "team-skills__skills-review-bot__8f2c91abcdef",
      sourcePath: "/Users/test/.skills-manager/cache/team-skills/skills/review-bot",
      status: "pending",
      targetName: "Codex",
      targetPath: "/Users/test/.codex/skills/skills-review-bot",
      targetSnapshot: {
        id: "codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        type: "codex"
      }
    }
  ],
  operationType: "install",
  status: "ready",
  summary: {
    actionCounts: { blocked: 0, conflict: 0, install: 1, skip: 0, update: 0 },
    itemCount: 1,
    skillCount: 1,
    targetCount: 1
  },
  triggerSource: "skill_detail"
};

const distributionConflictPreviewFixture: DistributionPreviewResult = {
  ...distributionPreviewFixture,
  id: "preview-conflict",
  items: [
    {
      ...distributionPreviewFixture.items[0],
      action: "conflict",
      allowedResolutions: ["overwrite", "skip"],
      defaultResolution: "overwrite",
      id: "preview-conflict-item-1",
      reason: "Target path already exists and is not owned by this skill."
    }
  ],
  status: "conflict",
  summary: {
    actionCounts: { blocked: 0, conflict: 1, install: 0, skip: 0, update: 0 },
    itemCount: 1,
    skillCount: 1,
    targetCount: 1
  }
};

const distributionExecuteFixture: DistributionExecuteResult = {
  items: [
    {
      action: "install",
      agentTargetId: "codex",
      errorMessage: null,
      result: "installed",
      skillUnitId: "team-skills__skills-review-bot",
      targetPath: "/Users/test/.codex/skills/skills-review-bot"
    }
  ],
  preview: distributionPreviewFixture,
  summary: {
    blocked: 0,
    conflicts: 0,
    failed: 0,
    installed: 1,
    skipped: 0,
    updated: 0
  }
};

const renderSkillsPage = async ({
  distributionExecute = distributionExecuteFixture,
  distributionPreview = distributionPreviewFixture,
  locale = "zh-CN",
  skills = [],
  targets = skillTargetsFixture
}: {
  distributionExecute?: DistributionExecuteResult;
  distributionPreview?: DistributionPreviewResult;
  locale?: "zh-CN" | "en-US";
  skills?: typeof skillApiRecordsFixture;
  targets?: TargetsListResult;
} = {}) => {
  const i18n = await createI18nInstance(locale);
  const setSkillTargetPreference = vi.fn().mockResolvedValue({ success: true });
  const addSkillDirectoryTarget = vi.fn().mockResolvedValue(targets);
  const executeDistribution = vi.fn().mockResolvedValue(distributionExecute);
  const previewDistribution = vi.fn().mockResolvedValue(distributionPreview);
  const selectTargetDirectory = vi.fn().mockResolvedValue("/Users/test/review-skills");

  window.skillsManager = {
    getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
    getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
    getLocale: vi.fn().mockResolvedValue(locale),
    listProviders: vi.fn().mockResolvedValue({ providers: [] }),
    listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
    listSkills: vi.fn().mockResolvedValue({ skills }),
    listTargets: vi.fn().mockResolvedValue(targets),
    addSkillDirectoryTarget,
    executeDistribution,
    previewDistribution,
    selectTargetDirectory,
    setSkillTargetPreference,
    platform: "darwin"
  };

  return {
    ...render(
      <I18nextProvider i18n={i18n}>
        <SkillsPage />
      </I18nextProvider>
    ),
    addSkillDirectoryTarget,
    executeDistribution,
    previewDistribution,
    selectTargetDirectory,
    setSkillTargetPreference
  };
};

const selectOption = async (label: string, optionName: string) => {
  fireEvent.pointerDown(screen.getByLabelText(label), { pointerType: "mouse" });
  fireEvent.mouseDown(screen.getByLabelText(label), { button: 0 });
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
};

describe("SkillsPage", () => {
  beforeEach(() => {
    window.skillsManager = undefined;
  });

  it("renders layout slots inside the page main and sider containers", () => {
    render(
      <PageLayout
        Main={() => <div data-testid="skills-layout-main-slot">Main slot</div>}
        Sider={() => <div data-testid="skills-layout-sider-slot">Sider slot</div>}
        siderLabel="Skill detail"
      />
    );

    expect(screen.getByRole("main")).toContainElement(
      screen.getByTestId("skills-layout-main-slot")
    );
    expect(screen.getByRole("complementary", { name: "Skill detail" })).toContainElement(
      screen.getByTestId("skills-layout-sider-slot")
    );
  });

  it("renders an empty skills surface without demo skill data", async () => {
    await renderSkillsPage();

    expect(screen.getByLabelText("技能筛选")).toHaveClass(
      "grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]"
    );
    const skillsTable = within(screen.getByRole("main")).getByRole("table");
    expect(within(skillsTable).getByRole("columnheader", { name: "技能" })).toBeInTheDocument();
    expect(within(skillsTable).getByRole("columnheader", { name: "仓库" })).toBeInTheDocument();
    expect(within(skillsTable).getByRole("columnheader", { name: "目标" })).toBeInTheDocument();
    expect(
      within(skillsTable).queryByRole("columnheader", { name: "启用" })
    ).not.toBeInTheDocument();
    expect(within(skillsTable).getByRole("columnheader", { name: "操作" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新增" })).not.toBeInTheDocument();
    const pageHeading = screen.getByRole("heading", { name: "技能分发" });
    const pageHeader = pageHeading.closest("header");

    expect(pageHeading).toBeInTheDocument();
    expect(pageHeader).not.toBeNull();
    expect(within(pageHeader as HTMLElement).queryByText("Skills")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("技能摘要")).not.toBeInTheDocument();
    expect(screen.getByText("暂无已索引技能。")).toHaveClass("text-center");
    expect(screen.getByRole("heading", { name: "请选择技能" })).toBeInTheDocument();
    expect(screen.queryByText("从来源分发并扫描后，这里会显示技能详情。")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "分发当前技能（暂未实现）" })
    ).not.toBeInTheDocument();
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderSkillsPage({ locale: "en-US" });

    expect(
      screen.getByRole("heading", { name: "Browse and Distribute Skills" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add skill" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Distribute selected skills" })).toBeInTheDocument();
    expect(screen.getByLabelText("Skill filters")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select a skill" })).toBeInTheDocument();
  });

  it("renders indexed skills returned by the Electron API", async () => {
    await renderSkillsPage({ skills: skillApiRecordsFixture });

    const skillButton = await screen.findByRole("button", { name: "Review Bot" });
    expect(skillButton).toBeInTheDocument();
    expect(screen.getAllByText("skills-review-bot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Team skills repository").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("main")).queryByText("版本")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryByText("状态")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryByText("8f2c91a")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryByText("ready")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("技能详情")).getByText("8f2c91a")).toBeInTheDocument();
    expect(within(screen.getByLabelText("技能详情")).getByText("Review Bot")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("技能详情")).getByText(
        "Reviews pull requests with concise, actionable feedback."
      )
    ).toHaveClass("mt-3");
    expect(screen.getByText("分发目标")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增分发目标" })).toBeInTheDocument();
    expect(screen.queryByText("同步目标")).not.toBeInTheDocument();
    const skillDetail = screen.getByLabelText("技能详情");
    const distributeButton = within(skillDetail).getByRole("button", { name: "分发当前技能" });

    expect(within(skillDetail).queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();
    expect(distributeButton).toHaveClass("bg-primary", "text-primary-foreground");
    expect(distributeButton).not.toHaveClass("border-border", "bg-background");
    expect(distributeButton).toBeDisabled();
    expect(distributeButton).toHaveAttribute("title", "请先添加分发目标");
    await waitFor(() => expect(window.skillsManager?.listSkills).toHaveBeenCalled());
  });

  it("line-clamps long selected skill descriptions and exposes the full text through a tooltip", async () => {
    const longDescription =
      Array.from(
        { length: 8 },
        (_, index) => `Line ${index + 1} keeps the selected skill detail readable.`
      ).join(" ") + " This extra detail should stay available in the hover tooltip.";
    const restoreDescriptionOverflowMock = mockDescriptionOverflow(longDescription);
    const skills: SkillApiRecord[] = [
      {
        description: longDescription,
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: [],
        version: "8f2c91a"
      }
    ];

    try {
      await renderSkillsPage({ skills });
      await screen.findByRole("button", { name: "Review Bot" });

      const skillDetail = screen.getByLabelText("技能详情");
      const descriptionTrigger = await within(skillDetail).findByText(longDescription);

      expect(descriptionTrigger).toHaveAttribute("data-slot", "tooltip-trigger");
      expect(descriptionTrigger).not.toHaveAttribute("title");
      expect(descriptionTrigger).toHaveClass("line-clamp-5", "max-w-full", "break-all");
      expect(descriptionTrigger).toHaveTextContent(longDescription);

      fireEvent.focus(descriptionTrigger);

      await screen.findByText(longDescription, {
        selector: '[data-slot="tooltip-content"]'
      });
    } finally {
      restoreDescriptionOverflowMock();
    }
  });

  it("renders short selected skill descriptions without a tooltip", async () => {
    const skills: SkillApiRecord[] = [
      {
        description: "Short descriptions stay as plain detail text.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: [],
        version: "8f2c91a"
      }
    ];

    await renderSkillsPage({ skills });
    await screen.findByRole("button", { name: "Review Bot" });

    const skillDetail = screen.getByLabelText("技能详情");
    const description = within(skillDetail).getByText(
      "Short descriptions stay as plain detail text."
    );

    expect(description).not.toHaveAttribute("data-slot", "tooltip-trigger");
    expect(description).toHaveClass("line-clamp-5");
    expect(
      within(skillDetail).queryByText("Short descriptions stay as plain detail text.", {
        selector: '[data-slot="tooltip-content"]'
      })
    ).not.toBeInTheDocument();
  });

  it("shows global targets for every skill unchecked and keeps independent targets scoped", async () => {
    const targets: TargetsListResult = {
      registeredTargets: [
        {
          createdAt: "2026-06-21T00:00:00.000Z",
          enabled: true,
          id: "target-team",
          name: "Team workspace",
          normalizedPath: "/Users/test/team/.codex/skills",
          path: "/Users/test/team/.codex/skills",
          scanMessage: null,
          selectedSkills: [],
          skillPreferences: [],
          skillCount: 0,
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
          normalizedPath: "/Users/test/design/.codex/skills",
          path: "/Users/test/design/.codex/skills",
          scanMessage: null,
          selectedSkills: [
            {
              id: "design-lab__design-helper",
              name: "Design Helper",
              repository: "Design lab prompts"
            }
          ],
          skillPreferences: [
            {
              enabled: true,
              id: "design-lab__design-helper",
              name: "Design Helper",
              repository: "Design lab prompts"
            }
          ],
          skillCount: 1,
          scope: "independent",
          status: "registered",
          type: "custom-directory",
          updatedAt: "2026-06-21T00:00:00.000Z"
        }
      ]
    };
    const skills: SkillApiRecord[] = [
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: [],
        version: "8f2c91a"
      },
      {
        description: "Creates starter prompts for design reviews.",
        enabled: true,
        entry: "skills/design-helper/SKILL.md",
        id: "design-lab__design-helper",
        name: "Design Helper",
        repository: "Design lab prompts",
        repositoryId: "design-lab",
        skillId: "design-helper",
        status: "review",
        tags: ["design"],
        targets: ["target-design-only"],
        version: "21ab9d0"
      }
    ];

    await renderSkillsPage({ skills, targets });
    await screen.findByRole("button", { name: "Review Bot" });

    expect(screen.getByText("0 / 1")).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Team workspace")).not.toBeChecked();
    expect(screen.queryByLabelText("选择 Design scratch")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Design Helper" }));

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Team workspace")).not.toBeChecked();
    expect(screen.getByLabelText("选择 Design scratch")).toBeChecked();
  });

  it("does not show deleted targets in the selected skill distribution targets", async () => {
    const targets: TargetsListResult = {
      registeredTargets: [
        {
          createdAt: "2026-06-21T00:00:00.000Z",
          enabled: true,
          id: "target-kept",
          name: "Kept workspace",
          normalizedPath: "/Users/test/kept/.codex/skills",
          path: "/Users/test/kept/.codex/skills",
          scanMessage: null,
          selectedSkills: [
            {
              id: "team-skills__skills-review-bot",
              name: "Review Bot",
              repository: "Team skills repository"
            }
          ],
          skillPreferences: [
            {
              enabled: true,
              id: "team-skills__skills-review-bot",
              name: "Review Bot",
              repository: "Team skills repository"
            }
          ],
          skillCount: 1,
          scope: "global",
          status: "registered",
          type: "custom-directory",
          updatedAt: "2026-06-21T00:00:00.000Z"
        }
      ]
    };
    const skills: SkillApiRecord[] = [
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: ["target-kept", "target-deleted"],
        version: "8f2c91a"
      }
    ];

    await renderSkillsPage({ skills, targets });
    await screen.findByRole("button", { name: "Review Bot" });

    expect(screen.getByLabelText("选择 Kept workspace")).toBeChecked();
    expect(screen.queryByLabelText("选择 Deleted workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("/Users/test/deleted/.codex/skills")).not.toBeInTheDocument();
  });

  it("records target checkbox changes and keeps the last checked state locally", async () => {
    const skills: SkillApiRecord[] = [
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: [],
        version: "8f2c91a"
      }
    ];
    const targets: TargetsListResult = {
      registeredTargets: [
        {
          createdAt: "2026-06-21T00:00:00.000Z",
          enabled: true,
          id: "target-team",
          name: "Team workspace",
          normalizedPath: "/Users/test/team/.codex/skills",
          path: "/Users/test/team/.codex/skills",
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
    const { setSkillTargetPreference } = await renderSkillsPage({ skills, targets });
    await screen.findByRole("button", { name: "Review Bot" });

    const targetCheckbox = screen.getByLabelText("选择 Team workspace");

    expect(targetCheckbox).not.toBeChecked();

    fireEvent.click(targetCheckbox);

    expect(targetCheckbox).toBeChecked();
    await waitFor(() =>
      expect(setSkillTargetPreference).toHaveBeenLastCalledWith({
        agentTargetId: "target-team",
        enabled: true,
        skillUnitId: "team-skills__skills-review-bot"
      })
    );

    fireEvent.click(targetCheckbox);

    expect(targetCheckbox).not.toBeChecked();
    await waitFor(() =>
      expect(setSkillTargetPreference).toHaveBeenLastCalledWith({
        agentTargetId: "target-team",
        enabled: false,
        skillUnitId: "team-skills__skills-review-bot"
      })
    );
  });

  it("adds a selected directory as an independent checked target for the current skill", async () => {
    const skills: SkillApiRecord[] = [
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: [],
        version: "8f2c91a"
      }
    ];
    const addedTargets: TargetsListResult = {
      registeredTargets: [
        {
          createdAt: "2026-06-23T00:00:00.000Z",
          enabled: true,
          id: "target-disabled-review-scratch",
          name: "review-disabled",
          normalizedPath: "/Users/test/review-disabled",
          path: "/Users/test/review-disabled",
          scanMessage: null,
          selectedSkills: [],
          skillPreferences: [
            {
              enabled: false,
              id: "team-skills__skills-review-bot",
              name: "Review Bot",
              repository: "Team skills repository"
            }
          ],
          skillCount: 0,
          scope: "independent",
          status: "registered",
          type: "custom-directory",
          updatedAt: "2026-06-23T00:00:00.000Z"
        },
        {
          createdAt: "2026-06-24T00:00:00.000Z",
          enabled: true,
          id: "target-custom-users-test-review-skills-16b7af9b49af",
          name: "review-skills",
          normalizedPath: "/Users/test/review-skills",
          path: "/Users/test/review-skills",
          scanMessage: null,
          selectedSkills: [
            {
              id: "team-skills__skills-review-bot",
              name: "Review Bot",
              repository: "Team skills repository"
            }
          ],
          skillPreferences: [
            {
              enabled: true,
              id: "team-skills__skills-review-bot",
              name: "Review Bot",
              repository: "Team skills repository"
            }
          ],
          skillCount: 1,
          scope: "independent",
          status: "registered",
          type: "custom-directory",
          updatedAt: "2026-06-24T00:00:00.000Z"
        }
      ]
    };
    const { addSkillDirectoryTarget, selectTargetDirectory, setSkillTargetPreference } =
      await renderSkillsPage({ skills, targets: { registeredTargets: [] } });

    addSkillDirectoryTarget.mockResolvedValueOnce(addedTargets);
    await screen.findByRole("button", { name: "Review Bot" });

    fireEvent.click(screen.getByRole("button", { name: "新增分发目标" }));

    expect(selectTargetDirectory).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(addSkillDirectoryTarget).toHaveBeenCalledWith({
        skillUnitId: "team-skills__skills-review-bot",
        targetPath: "/Users/test/review-skills"
      })
    );

    const addedTargetCheckbox = await screen.findByLabelText("选择 review-skills");

    expect(addedTargetCheckbox).toBeChecked();
    expect(screen.getByLabelText("选择 review-disabled")).not.toBeChecked();
    expect(screen.getByText("/Users/test/review-skills")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(addedTargetCheckbox);

    expect(addedTargetCheckbox).not.toBeChecked();
    await waitFor(() =>
      expect(setSkillTargetPreference).toHaveBeenLastCalledWith({
        agentTargetId: "target-custom-users-test-review-skills-16b7af9b49af",
        enabled: false,
        skillUnitId: "team-skills__skills-review-bot"
      })
    );
  });

  it("searches skills by name, repository, or description only", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });

    const searchField = screen.getByLabelText("搜索技能");

    expect(searchField).toHaveAttribute("placeholder", "搜索名称、仓库或描述");

    fireEvent.change(searchField, { target: { value: "starter prompts" } });
    expect(screen.getByRole("button", { name: "Design Helper" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review Bot" })).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "Team skills repository" } });
    expect(screen.getByRole("button", { name: "Review Bot" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Release Notes" })).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "Release Notes" } });
    expect(screen.getByRole("button", { name: "Release Notes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Design Helper" })).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "design-helper" } });
    expect(screen.getByText("暂无已索引技能。")).toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "writing" } });
    expect(screen.getByText("暂无已索引技能。")).toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "release-notes/SKILL.md" } });
    expect(screen.getByText("暂无已索引技能。")).toBeInTheDocument();
  });

  it("filters skills by repository", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });
    expect(screen.queryByLabelText("状态")).not.toBeInTheDocument();

    await selectOption("仓库", "Design lab prompts");
    expect(screen.getByRole("button", { name: "Design Helper" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review Bot" })).not.toBeInTheDocument();
  });

  it("selects a skill when clicking a non-interactive row cell", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });

    fireEvent.click(screen.getByText("Design lab prompts"));

    expect(
      within(screen.getByLabelText("技能详情")).getByText("Design Helper")
    ).toBeInTheDocument();
  });

  it("sorts skills by name and repository", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });

    let rows = screen.getAllByRole("button", {
      name: (name, element) =>
        element.tagName.toLowerCase() === "button" &&
        ["Design Helper", "Release Notes", "Review Bot"].includes(name)
    });
    expect(rows.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Design Helper",
      "Release Notes",
      "Review Bot"
    ]);

    fireEvent.pointerDown(screen.getByLabelText("排序"), { pointerType: "mouse" });
    fireEvent.mouseDown(screen.getByLabelText("排序"), { button: 0 });
    expect(screen.queryByRole("option", { name: "推荐" })).not.toBeInTheDocument();
    const repositorySortOption = await screen.findByRole("option", { name: "仓库" });
    fireEvent.pointerDown(repositorySortOption, { pointerType: "mouse" });
    fireEvent.click(repositorySortOption);

    rows = screen.getAllByRole("button", {
      name: (name, element) =>
        element.tagName.toLowerCase() === "button" &&
        ["Design Helper", "Release Notes", "Review Bot"].includes(name)
    });
    expect(rows.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Design Helper",
      "Release Notes",
      "Review Bot"
    ]);
  });

  it("paginates large skill lists after filtering and limits select-all to the current page", async () => {
    await renderSkillsPage({ skills: createPagedSkillRecords(25) });
    await screen.findByRole("button", { name: "Paged Skill 01" });

    expect(screen.getByRole("button", { name: "Paged Skill 20" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Skill 21" })).not.toBeInTheDocument();
    expect(screen.getByText("1-20 / 25")).toBeInTheDocument();
    const skillsTable = screen.getByRole("table");
    const tableBody = skillsTable.querySelector("[data-slot='table-body']");
    const paginationFooter = screen.getByText("1-20 / 25").closest("tfoot");

    expect(skillsTable.closest("section")).toHaveClass("flex-1", "min-h-0", "overflow-hidden");
    expect(tableBody).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    expect(tableBody).toContainElement(screen.getByRole("button", { name: "Paged Skill 20" }));
    expect(paginationFooter).not.toBeNull();
    expect(tableBody).not.toContainElement(paginationFooter as HTMLElement);
    expect(paginationFooter).toHaveClass("shrink-0");
    expect(paginationFooter).not.toHaveClass("sticky");

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));

    expect(await screen.findByRole("button", { name: "Paged Skill 21" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Skill 25" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Skill 20" })).not.toBeInTheDocument();
    expect(screen.getByText("21-25 / 25")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择全部可见技能"));

    expect(screen.getByLabelText("选择 Paged Skill 21")).toBeChecked();
    expect(screen.getByLabelText("选择 Paged Skill 25")).toBeChecked();

    fireEvent.click(screen.getByRole("link", { name: "上一页" }));

    expect(await screen.findByRole("button", { name: "Paged Skill 01" })).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Paged Skill 01")).not.toBeChecked();

    fireEvent.change(screen.getByLabelText("搜索技能"), { target: { value: "Paged Skill 25" } });

    expect(await screen.findByRole("button", { name: "Paged Skill 25" })).toBeInTheDocument();
    expect(screen.getByText("1-1 / 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Skill 01" })).not.toBeInTheDocument();
  });

  it("resets paged results after sorting and filters repositories before paginating", async () => {
    const skills = createPagedSkillRecords(25).map((skill, index) => ({
      ...skill,
      repository: index >= 20 ? "A catalog" : "B catalog"
    }));

    await renderSkillsPage({ skills });
    await screen.findByRole("button", { name: "Paged Skill 01" });

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));
    expect(await screen.findByText("21-25 / 25")).toBeInTheDocument();

    await selectOption("排序", "仓库");

    expect(await screen.findByText("1-20 / 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Skill 21" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Skill 16" })).not.toBeInTheDocument();

    await selectOption("仓库", "A catalog");

    expect(await screen.findByText("1-5 / 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paged Skill 25" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paged Skill 01" })).not.toBeInTheDocument();
  });

  it("keeps hidden paged selections available to bulk distribution", async () => {
    const skills = createPagedSkillRecords(25).map((skill) => ({
      ...skill,
      targets: ["codex"]
    }));

    await renderSkillsPage({ skills });
    await screen.findByRole("button", { name: "Paged Skill 01" });

    const distributeButton = screen.getByRole("button", { name: "分发选中的技能" });

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));
    expect(await screen.findByRole("button", { name: "Paged Skill 21" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("选择全部可见技能"));

    expect(screen.getByLabelText("选择 Paged Skill 21")).toBeChecked();
    expect(distributeButton).toBeEnabled();
    expect(distributeButton).toHaveAttribute("title", "准备分发");

    fireEvent.click(screen.getByRole("link", { name: "上一页" }));

    expect(await screen.findByRole("button", { name: "Paged Skill 01" })).toBeInTheDocument();
    expect(screen.getByLabelText("选择 Paged Skill 01")).not.toBeChecked();
    expect(distributeButton).toBeEnabled();
    expect(distributeButton).toHaveAttribute("title", "准备分发");
  });

  it("uses the current paged skill for distribution and target preference changes", async () => {
    const skills = createPagedSkillRecords(21).map((skill) => ({
      ...skill,
      targets: ["codex"]
    }));
    const { previewDistribution, setSkillTargetPreference } = await renderSkillsPage({
      skills
    });
    await screen.findByRole("button", { name: "Paged Skill 01" });

    fireEvent.click(screen.getByRole("link", { name: "下一页" }));

    expect(await screen.findByRole("button", { name: "Paged Skill 21" })).toBeInTheDocument();
    const skillDetail = screen.getByLabelText("技能详情");

    expect(
      within(skillDetail).getByRole("heading", { name: "Paged Skill 21" })
    ).toBeInTheDocument();

    fireEvent.click(within(skillDetail).getByRole("button", { name: "分发当前技能" }));

    await waitFor(() =>
      expect(previewDistribution).toHaveBeenCalledWith({
        skillUnitIds: ["catalog__paged-skill-21"],
        triggerSource: "skill_detail"
      })
    );
    const confirmDialog = await screen.findByRole("dialog", { name: "确认分发" });

    fireEvent.click(within(confirmDialog).getByRole("button", { name: "取消" }));

    fireEvent.click(screen.getByLabelText("选择 Claude Code"));

    await waitFor(() =>
      expect(setSkillTargetPreference).toHaveBeenCalledWith({
        agentTargetId: "claude",
        enabled: true,
        skillUnitId: "catalog__paged-skill-21"
      })
    );
  });

  it("checks individual skills and all currently visible skills", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });

    const distributeButton = screen.getByRole("button", { name: "分发选中的技能" });
    expect(distributeButton).toHaveClass("bg-primary", "text-primary-foreground");
    expect(distributeButton).not.toHaveClass("border-border", "bg-background");
    expect(distributeButton).toBeDisabled();
    expect(distributeButton).toHaveAttribute("title", "请先选择要分发的技能");

    fireEvent.click(screen.getByLabelText("选择 Review Bot"));
    expect(screen.getByLabelText("选择 Review Bot")).toBeChecked();
    expect(distributeButton).toHaveTextContent("分发");
    expect(distributeButton).not.toHaveTextContent(/\(\d+\)/);
    expect(distributeButton).toBeDisabled();
    expect(distributeButton).toHaveAttribute("title", "选中的技能没有分发目标");

    fireEvent.click(screen.getByLabelText("选择全部可见技能"));
    expect(screen.getByLabelText("选择 Review Bot")).toBeChecked();
    expect(screen.getByLabelText("选择 Design Helper")).toBeChecked();
    expect(screen.getByLabelText("选择 Release Notes")).toBeChecked();
    expect(distributeButton).toHaveTextContent("分发");
    expect(distributeButton).not.toHaveTextContent(/\(\d+\)/);

    fireEvent.change(screen.getByLabelText("搜索技能"), { target: { value: "Review Bot" } });
    fireEvent.click(screen.getByLabelText("选择全部可见技能"));
    expect(screen.getByLabelText("选择 Review Bot")).not.toBeChecked();
    expect(distributeButton).toHaveTextContent("分发");
    expect(distributeButton).not.toHaveTextContent(/\(\d+\)/);
    expect(distributeButton).toBeEnabled();
    expect(distributeButton).toHaveAttribute("title", "准备分发");
  });

  it("implements distribution button states before opening confirmation", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });

    const bulkDistributeButton = screen.getByRole("button", { name: "分发选中的技能" });
    expect(bulkDistributeButton).toBeDisabled();
    expect(bulkDistributeButton).toHaveAttribute("title", "请先选择要分发的技能");

    const reviewRowDistributeButton = screen.getByRole("button", { name: "分发 Review Bot" });
    expect(reviewRowDistributeButton).toHaveClass("bg-primary", "text-primary-foreground");
    expect(reviewRowDistributeButton).not.toHaveClass("border-border", "bg-background");
    expect(reviewRowDistributeButton).toBeDisabled();
    expect(reviewRowDistributeButton).toHaveAttribute("title", "请先添加分发目标");

    const detailDistributeButton = within(screen.getByLabelText("技能详情")).getByRole("button", {
      name: "分发当前技能"
    });
    expect(detailDistributeButton).toBeDisabled();
    expect(detailDistributeButton).toHaveAttribute("title", "请先添加分发目标");

    fireEvent.click(screen.getByLabelText("选择 Review Bot"));
    expect(bulkDistributeButton).toHaveTextContent("分发");
    expect(bulkDistributeButton).not.toHaveTextContent(/\(\d+\)/);
    expect(bulkDistributeButton).toBeDisabled();
    expect(bulkDistributeButton).toHaveAttribute("title", "选中的技能没有分发目标");

    fireEvent.click(screen.getByLabelText("选择 Review Bot"));
    fireEvent.click(screen.getByLabelText("选择 Design Helper"));
    const designRowDistributeButton = screen.getByRole("button", { name: "分发 Design Helper" });
    expect(bulkDistributeButton).toHaveTextContent("分发");
    expect(bulkDistributeButton).not.toHaveTextContent(/\(\d+\)/);
    expect(bulkDistributeButton).toBeEnabled();
    expect(bulkDistributeButton).toHaveAttribute("title", "准备分发");
    expect(designRowDistributeButton).toHaveClass("bg-primary", "text-primary-foreground");
    expect(designRowDistributeButton).toBeEnabled();
    expect(designRowDistributeButton).toHaveAttribute("title", "准备分发");

    fireEvent.click(screen.getByRole("button", { name: "Design Helper" }));
    const selectedDetailDistributeButton = within(screen.getByLabelText("技能详情")).getByRole(
      "button",
      { name: "分发当前技能" }
    );
    expect(selectedDetailDistributeButton).toBeEnabled();
    expect(selectedDetailDistributeButton).toHaveAttribute("title", "准备分发");
  });

  it("confirms and executes distribution from the selected skill dialog", async () => {
    const skills: SkillApiRecord[] = [
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: ["codex"],
        version: "8f2c91a"
      }
    ];
    const { executeDistribution, previewDistribution } = await renderSkillsPage({ skills });
    await screen.findByRole("button", { name: "Review Bot" });

    const skillDetail = screen.getByLabelText("技能详情");
    const summarySection = within(skillDetail)
      .getByRole("heading", { name: "Review Bot" })
      .closest("section") as HTMLElement;

    expect(
      within(skillDetail).queryByRole("heading", { name: "确认分发" })
    ).not.toBeInTheDocument();
    expect(within(summarySection).queryByRole("button", { name: "预览" })).not.toBeInTheDocument();
    expect(
      within(summarySection).getByRole("button", { name: "分发当前技能" })
    ).toBeInTheDocument();

    fireEvent.click(within(summarySection).getByRole("button", { name: "分发当前技能" }));

    await waitFor(() =>
      expect(previewDistribution).toHaveBeenCalledWith({
        skillUnitIds: ["team-skills__skills-review-bot"],
        triggerSource: "skill_detail"
      })
    );
    const confirmDialog = await screen.findByRole("dialog", { name: "确认分发" });

    expect(within(confirmDialog).getByText("Codex")).toBeInTheDocument();
    expect(within(confirmDialog).getByText("安装")).toBeInTheDocument();
    expect(
      within(confirmDialog).getByText("/Users/test/.codex/skills/skills-review-bot")
    ).toBeInTheDocument();

    fireEvent.click(within(confirmDialog).getByRole("button", { name: "确认分发" }));

    await waitFor(() =>
      expect(executeDistribution).toHaveBeenCalledWith({
        conflictResolutions: [],
        skillUnitIds: ["team-skills__skills-review-bot"],
        triggerSource: "skill_detail"
      })
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "确认分发" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "分发完成：安装 1，更新 0，跳过 0，冲突 0，阻止 0，失败 0。"
    );
    expect(
      within(skillDetail).queryByRole("heading", { name: "确认分发" })
    ).not.toBeInTheDocument();
  });

  it("defaults conflict distribution to overwrite and allows choosing skip", async () => {
    const skills: SkillApiRecord[] = [
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "team-skills__skills-review-bot",
        name: "Review Bot",
        repository: "Team skills repository",
        repositoryId: "team-skills",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review"],
        targets: ["codex"],
        version: "8f2c91a"
      }
    ];
    const { executeDistribution } = await renderSkillsPage({
      distributionPreview: distributionConflictPreviewFixture,
      skills
    });
    await screen.findByRole("button", { name: "Review Bot" });

    fireEvent.click(
      within(screen.getByLabelText("技能详情")).getByRole("button", {
        name: "分发当前技能"
      })
    );

    const confirmDialog = await screen.findByRole("dialog", { name: "确认分发" });

    expect(within(confirmDialog).getByText("冲突")).toBeInTheDocument();
    const conflictResolution = within(confirmDialog).getByRole("combobox", {
      name: "处理 Review Bot 到 Codex 的冲突"
    });

    expect(conflictResolution).toHaveValue("overwrite");

    fireEvent.click(within(confirmDialog).getByRole("button", { name: "确认分发" }));

    await waitFor(() =>
      expect(executeDistribution).toHaveBeenLastCalledWith({
        conflictResolutions: [
          {
            agentTargetId: "codex",
            previewItemId: "preview-conflict-item-1",
            resolution: "overwrite",
            skillUnitId: "team-skills__skills-review-bot",
            targetPath: "/Users/test/.codex/skills/skills-review-bot"
          }
        ],
        skillUnitIds: ["team-skills__skills-review-bot"],
        triggerSource: "skill_detail"
      })
    );

    fireEvent.click(
      within(screen.getByLabelText("技能详情")).getByRole("button", {
        name: "分发当前技能"
      })
    );

    const nextConfirmDialog = await screen.findByRole("dialog", { name: "确认分发" });
    fireEvent.change(
      within(nextConfirmDialog).getByRole("combobox", {
        name: "处理 Review Bot 到 Codex 的冲突"
      }),
      { target: { value: "skip" } }
    );
    fireEvent.click(within(nextConfirmDialog).getByRole("button", { name: "确认分发" }));

    await waitFor(() =>
      expect(executeDistribution).toHaveBeenLastCalledWith({
        conflictResolutions: [
          {
            agentTargetId: "codex",
            previewItemId: "preview-conflict-item-1",
            resolution: "skip",
            skillUnitId: "team-skills__skills-review-bot",
            targetPath: "/Users/test/.codex/skills/skills-review-bot"
          }
        ],
        skillUnitIds: ["team-skills__skills-review-bot"],
        triggerSource: "skill_detail"
      })
    );
  });
});
