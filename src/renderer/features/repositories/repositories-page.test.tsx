import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { RepositoriesPage } from "./repositories-page";
import { createI18nInstance } from "@/i18n/react-i18n";

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

    expect(screen.getByRole("heading", { name: "管理仓库缓存与扫描结果" })).toBeInTheDocument();
    expect(screen.getByLabelText("仓库筛选")).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team skills repository" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("heading", { name: "Team skills repository" })).toBeInTheDocument();
    expect(screen.getByText("同步影响")).toBeInTheDocument();
  });

  it("filters repositories by provider and status", async () => {
    await renderRepositoriesPage();

    fireEvent.change(screen.getByLabelText("来源类型"), { target: { value: "GitLab" } });
    expect(screen.getByRole("button", { name: "Design lab prompts" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Team skills repository" })
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("扫描状态"), { target: { value: "ready" } });
    expect(screen.getByText("没有匹配的仓库。调整搜索或筛选条件。")).toBeInTheDocument();
  });

  it("updates the detail pane when a repository row is selected", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "Local development skills" }));

    const detail = screen.getByLabelText("仓库详情");
    expect(
      within(detail).getByRole("heading", { name: "Local development skills" })
    ).toBeInTheDocument();
    expect(within(detail).getAllByText("D:/workspace/local-skills").length).toBeGreaterThan(0);
    expect(
      within(detail).getByText("agents/skills/*/SKILL.md, skills/*/SKILL.md")
    ).toBeInTheDocument();
  });

  it("syncs and force rescans the selected repository", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "Design lab prompts" }));
    fireEvent.click(screen.getByRole("button", { name: "同步选中" }));
    expect(
      within(screen.getByLabelText("仓库详情")).getAllByText("刚刚同步").length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "强制重新扫描" }));
    expect(
      within(screen.getByLabelText("仓库详情")).getAllByText("刚刚强制扫描").length
    ).toBeGreaterThan(0);
  });

  it("toggles repository enabled state from the table", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "skills.sh market index" }));
    const switchControl = screen.getByRole("switch", { name: "启用 skills.sh market index" });
    expect(switchControl).toHaveAttribute("aria-checked", "false");

    fireEvent.click(switchControl);
    expect(switchControl).toHaveAttribute("aria-checked", "true");
    expect(within(screen.getByLabelText("仓库详情")).getByText("true")).toBeInTheDocument();
  });

  it("adds a repository through the modal form", async () => {
    await renderRepositoriesPage();

    fireEvent.click(screen.getByRole("button", { name: "新增仓库" }));
    const dialog = screen.getByRole("dialog", { name: "新增仓库" });
    fireEvent.change(within(dialog).getByLabelText("名称"), {
      target: { value: "Docs skill experiments" }
    });
    fireEvent.change(within(dialog).getByLabelText("URL / 本机路径"), {
      target: { value: "git@github.com:team/docs-skills.git" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存仓库" }));

    expect(screen.getByRole("button", { name: "Docs skill experiments" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Docs skill experiments" })).toBeInTheDocument();
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderRepositoriesPage("en-US");

    expect(
      screen.getByRole("heading", { name: "Manage repository cache and scan results" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Repository filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add repository" })).toBeInTheDocument();
  });
});
