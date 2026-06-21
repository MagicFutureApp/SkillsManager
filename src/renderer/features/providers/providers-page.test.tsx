import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { ProvidersPage } from "./providers-page";
import { createI18nInstance } from "@/i18n/react-i18n";
import { providerApiRecordsFixture } from "@/test/api-fixtures";

const renderProvidersPage = async (locale: "zh-CN" | "en-US" = "zh-CN") => {
  const i18n = await createI18nInstance(locale);

  const result = render(
    <I18nextProvider i18n={i18n}>
      <ProvidersPage />
    </I18nextProvider>
  );

  await screen.findByRole("button", { name: "GitHub" });

  return result;
};

const selectOption = async (label: string, optionName: string) => {
  fireEvent.pointerDown(screen.getByLabelText(label), { pointerType: "mouse" });
  fireEvent.mouseDown(screen.getByLabelText(label), { button: 0 });
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
};

describe("ProvidersPage", () => {
  beforeEach(() => {
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
      listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
      platform: "win32"
    };
  });

  it("renders the provider management surface from the HTML mockup", async () => {
    await renderProvidersPage();

    const pageHeading = screen.getByRole("heading", { name: "管理 Provider 与连接诊断" });
    const pageHeader = pageHeading.closest("header");

    expect(pageHeading).toBeInTheDocument();
    expect(pageHeader).not.toBeNull();
    expect(within(pageHeader as HTMLElement).queryByText("Provider")).not.toBeInTheDocument();
    expect(screen.getByLabelText("筛选 Provider")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GitHub" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.getByText("默认发现规则")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Provider 详情")).getByText("系统 Git 凭据")
    ).toBeInTheDocument();
  });

  it("filters providers by provider type and status", async () => {
    await renderProvidersPage();

    await selectOption("Provider", "GitLab");
    expect(screen.getByRole("button", { name: "GitLab" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "GitHub" })).not.toBeInTheDocument();

    await selectOption("状态", "connected");
    expect(screen.getByText("没有匹配的 Provider。调整筛选条件。")).toBeInTheDocument();
  });

  it("updates the detail pane when a provider row is selected", async () => {
    await renderProvidersPage();

    fireEvent.click(screen.getByRole("button", { name: "Local Git" }));

    const detail = screen.getByLabelText("Provider 详情");
    expect(within(detail).getByRole("heading", { name: "Local Git" })).toBeInTheDocument();
    expect(within(detail).getByText("agents/skills/*/SKILL.md")).toBeInTheDocument();
    expect(within(detail).getByText("Local filesystem")).toBeInTheDocument();
  });

  it("connects and disconnects the selected provider through page actions", async () => {
    await renderProvidersPage();

    fireEvent.click(screen.getByRole("button", { name: "Bitbucket" }));

    const detail = screen.getByLabelText("Provider 详情");
    expect(within(detail).getByRole("button", { name: "连接" })).toBeEnabled();

    fireEvent.click(within(detail).getByRole("button", { name: "连接" }));
    expect(within(detail).getAllByText("connected").length).toBeGreaterThan(0);
    expect(within(detail).getByRole("button", { name: "连接" })).toBeDisabled();

    fireEvent.click(within(detail).getByRole("button", { name: "取消连接" }));
    expect(within(detail).getAllByText("error").length).toBeGreaterThan(0);
    expect(within(detail).getByRole("button", { name: "连接" })).toBeEnabled();
  });

  it("renders English UI copy when initialized with en-US", async () => {
    await renderProvidersPage("en-US");

    expect(
      screen.getByRole("heading", { name: "Manage providers and connection diagnostics" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Provider filters")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Provider details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run diagnostics" })).toBeInTheDocument();
  });
});
