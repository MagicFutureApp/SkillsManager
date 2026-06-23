import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { PageLayout } from "@/components/layout/page-layout";
import { SkillsPage } from "./skills-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import { skillApiRecordsFixture } from "@/test/api-fixtures";
import type { SkillApiRecord } from "../../../core/skills/skill-api";

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

const renderSkillsPage = async ({
  locale = "zh-CN",
  skills = []
}: {
  locale?: "zh-CN" | "en-US";
  skills?: typeof skillApiRecordsFixture;
} = {}) => {
  const i18n = await createI18nInstance(locale);

  window.skillsManager = {
    getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
    getInfo: vi.fn().mockResolvedValue({ name: "Skillport", version: "0.1.0" }),
    getLocale: vi.fn().mockResolvedValue(locale),
    listProviders: vi.fn().mockResolvedValue({ providers: [] }),
    listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
    listSkills: vi.fn().mockResolvedValue({ skills }),
    platform: "darwin"
  };

  return render(
    <I18nextProvider i18n={i18n}>
      <SkillsPage />
    </I18nextProvider>
  );
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
    expect(screen.getByRole("heading", { name: "选择一个技能" })).toBeInTheDocument();
    expect(screen.getByText("从来源分发并扫描后，这里会显示技能详情。")).toBeInTheDocument();
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderSkillsPage({ locale: "en-US" });

    expect(
      screen.getByRole("heading", { name: "Browse skill units and preview distribution plans" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add skill" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Distribute selected skills" })).toBeInTheDocument();
    expect(screen.getByLabelText("Skill filters")).toBeInTheDocument();
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
    const editButton = within(skillDetail).getByRole("button", { name: "编辑" });
    const distributeButton = within(skillDetail).getByRole("button", {
      name: "分发当前技能（暂未实现）"
    });

    expect(editButton).toHaveClass("border-border", "bg-background");
    expect(distributeButton).toHaveClass("border-border", "bg-background");
    await waitFor(() => expect(window.skillsManager?.listSkills).toHaveBeenCalled());
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

  it("checks individual skills and all currently visible skills", async () => {
    await renderSkillsPage({ skills: interactiveSkillRecordsFixture });
    await screen.findByRole("button", { name: "Review Bot" });

    const distributeButton = screen.getByRole("button", { name: "分发选中的技能" });
    expect(distributeButton).toBeDisabled();
    expect(distributeButton).toHaveAttribute("title", "分发暂未实现");

    fireEvent.click(screen.getByLabelText("选择 Review Bot"));
    expect(screen.getByLabelText("选择 Review Bot")).toBeChecked();
    expect(distributeButton).toHaveTextContent("分发 (1)");
    expect(distributeButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText("选择全部可见技能"));
    expect(screen.getByLabelText("选择 Review Bot")).toBeChecked();
    expect(screen.getByLabelText("选择 Design Helper")).toBeChecked();
    expect(screen.getByLabelText("选择 Release Notes")).toBeChecked();
    expect(distributeButton).toHaveTextContent("分发 (3)");

    fireEvent.change(screen.getByLabelText("搜索技能"), { target: { value: "Review Bot" } });
    fireEvent.click(screen.getByLabelText("选择全部可见技能"));
    expect(screen.getByLabelText("选择 Review Bot")).not.toBeChecked();
    expect(distributeButton).toHaveTextContent("分发 (2)");
  });
});
