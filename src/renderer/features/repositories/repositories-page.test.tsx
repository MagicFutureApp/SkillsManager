import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { RepositoriesPage } from "./repositories-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import { defaultProviderApiRecords } from "../../../core/providers/provider-api";
import { defaultRepositoryApiRecords } from "../../../core/repositories/repository-api";

const renderRepositoriesPage = async (locale: "zh-CN" | "en-US" = "zh-CN") => {
  const i18n = await createI18nInstance(locale);

  return render(
    <I18nextProvider i18n={i18n}>
      <RepositoriesPage />
    </I18nextProvider>
  );
};

describe("RepositoriesPage", () => {
  it("renders the repositories management surface from the HTML mockup", async () => {
    await renderRepositoriesPage();

    expect(screen.getByRole("heading", { name: "管理来源与扫描结果" })).toBeInTheDocument();
    expect(screen.getByLabelText("来源筛选")).toBeInTheDocument();
    expect(screen.queryByText("启用仓库")).not.toBeInTheDocument();
    expect(screen.queryByText("已索引技能")).not.toBeInTheDocument();
    expect(screen.queryByText("需要复核")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team skills repository" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("heading", { name: "Team skills repository" })).toBeInTheDocument();
    expect(screen.getByText("同步影响")).toBeInTheDocument();
  });

  it("filters sources by provider and status", async () => {
    await renderRepositoriesPage();

    fireEvent.change(screen.getByLabelText("来源类型"), { target: { value: "GitLab" } });
    expect(screen.getByRole("button", { name: "Design lab prompts" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Team skills repository" })
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("扫描状态"), { target: { value: "ready" } });
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

  it("syncs and force rescans the selected source", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "Design lab prompts" }));
    fireEvent.click(screen.getByRole("button", { name: "同步选中" }));
    expect(
      within(screen.getByLabelText("来源详情")).getAllByText("刚刚同步").length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "强制重新扫描" }));
    expect(
      within(screen.getByLabelText("来源详情")).getAllByText("刚刚强制扫描").length
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
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增来源" }));
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
    expect(patternsField).toHaveAttribute(
      "placeholder",
      "例: skills/*/SKILL.md 或 SKILL.md 等"
    );
    expect(within(dialog).queryByText("缓存目录")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("名称"), {
      target: { value: "Docs skill experiments" }
    });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "git@github.com:team/docs-skills.git" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存来源" }));

    expect(screen.getByRole("button", { name: "Docs skill experiments" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Docs skill experiments" })).toBeInTheDocument();
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
      listProviders: vi.fn().mockResolvedValue({ providers: defaultProviderApiRecords }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: defaultRepositoryApiRecords })
    };
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增来源" }));
    const dialog = screen.getByRole("dialog", { name: "新增来源" });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "https://github.com/anthropics/skills" }
    });

    expect(await within(dialog).findByDisplayValue("anthropics/skills")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("来源类型")).toHaveValue("GitHub");
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
    expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
  });
});
