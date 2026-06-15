import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { PageLayout } from "@/components/layout/page-layout";
import { SkillsPage } from "./skills-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import { skillApiRecordsFixture } from "@/test/api-fixtures";

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
      "grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
    );
    expect(screen.getByLabelText("选择全部可见技能").closest("div")).toHaveClass("bg-muted/40");
    expect(screen.getByRole("button", { name: "新增" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "浏览 skill unit 并预览分发计划" })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("技能摘要")).not.toBeInTheDocument();
    expect(screen.getByText("暂无已索引技能。")).toHaveClass("text-center");
    expect(screen.getByRole("heading", { name: "选择一个技能" })).toBeInTheDocument();
    expect(screen.getByText("从来源同步并扫描后，这里会显示技能详情。")).toBeInTheDocument();
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderSkillsPage({ locale: "en-US" });

    expect(
      screen.getByRole("heading", { name: "Browse skill units and preview distribution plans" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add skill" })).toBeInTheDocument();
    expect(screen.getByLabelText("Skill filters")).toBeInTheDocument();
  });

  it("renders indexed skills returned by the Electron API", async () => {
    await renderSkillsPage({ skills: skillApiRecordsFixture });

    const skillButton = await screen.findByRole("button", { name: "Review Bot" });
    expect(skillButton).toBeInTheDocument();
    expect(screen.getAllByText("skills-review-bot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Team skills repository").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8f2c91a").length).toBeGreaterThan(0);
    expect(within(screen.getByLabelText("技能详情")).getByText("Review Bot")).toBeInTheDocument();
    await waitFor(() => expect(window.skillsManager?.listSkills).toHaveBeenCalled());
  });
});
