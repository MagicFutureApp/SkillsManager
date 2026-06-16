import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { SettingsPage } from "./settings-page";

describe("SettingsPage", () => {
  beforeEach(() => {
    window.skillsManager = {
      clearGitHubToken: vi.fn().mockResolvedValue({ github: { hasToken: false } }),
      getAppSettings: vi.fn().mockResolvedValue({ github: { hasToken: true } }),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: [] }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
      openExternalUrl: vi.fn().mockResolvedValue(undefined),
      platform: "win32",
      saveGitHubToken: vi.fn().mockResolvedValue({ github: { hasToken: true } })
    };
  });

  it("shows GitHub token status without rendering the saved token value", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("已配置")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub token")).toHaveValue("");
    expect(
      screen.getByText("当前 token 不会回显，输入新 token 后保存即可替换。")
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "如何创建 GitHub token" })).toBeInTheDocument();
    expect(screen.getByText(/Fine-grained personal access token/)).toBeInTheDocument();
    expect(screen.getByText("Contents: Read-only")).toBeInTheDocument();
    expect(screen.getByText("Metadata: Read-only")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "打开 GitHub token 创建页面" })
    ).not.toBeInTheDocument();
    expect(window.skillsManager?.getAppSettings).toHaveBeenCalled();
  });

  it("opens the GitHub token creation page through the system browser", async () => {
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "打开 GitHub token 创建页面" }));

    expect(window.skillsManager?.openExternalUrl).toHaveBeenCalledWith(
      "https://github.com/settings/personal-access-tokens/new?name=Skills+Manager&description=Read+repository+metadata+and+SKILL.md+files&contents=read"
    );
  });

  it("saves a new GitHub token and clears the input", async () => {
    render(<SettingsPage />);

    const tokenInput = await screen.findByLabelText("GitHub token");
    fireEvent.change(tokenInput, { target: { value: "  github_pat_new  " } });
    fireEvent.click(screen.getByRole("button", { name: "保存 GitHub token" }));

    await waitFor(() =>
      expect(window.skillsManager?.saveGitHubToken).toHaveBeenCalledWith("github_pat_new")
    );
    expect(tokenInput).toHaveValue("");
    expect(screen.getByText("已保存 GitHub token。")).toBeInTheDocument();
  });

  it("clears the saved GitHub token", async () => {
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "清除 GitHub token" }));

    await waitFor(() => expect(window.skillsManager?.clearGitHubToken).toHaveBeenCalled());
    expect(screen.getByText("未配置")).toBeInTheDocument();
  });
});
