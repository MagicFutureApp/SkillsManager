import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { PageLayout } from "@/components/layout/page-layout";
import { SkillsPage } from "./skills-page";
import { createI18nInstance } from "@/i18n/react-i18n";

const renderSkillsPage = async (locale: "zh-CN" | "en-US" = "zh-CN") => {
  const i18n = await createI18nInstance(locale);

  return render(
    <I18nextProvider i18n={i18n}>
      <SkillsPage />
    </I18nextProvider>
  );
};

describe("SkillsPage", () => {
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

  it("renders the skills design surface from the HTML mockup", async () => {
    await renderSkillsPage();

    expect(
      screen.getByRole("heading", { name: "浏览 skill unit 并预览分发计划" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Prompt Engineering Basic")).toHaveLength(2);
    expect(screen.getByText("Browser QA checklist")).toBeInTheDocument();
    expect(screen.getByText("Refactor notes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "同步目标" })).toBeInTheDocument();
    expect(screen.getByText("~/.codex/skills")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "计划预览" })).toBeInTheDocument();
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderSkillsPage("en-US");

    expect(
      screen.getByRole("heading", { name: "Browse skill units and preview distribution plans" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add skill" })).toBeInTheDocument();
    expect(screen.getByLabelText("Skill filters")).toBeInTheDocument();
  });
});
