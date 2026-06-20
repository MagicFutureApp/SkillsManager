import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { SettingsPage } from "./settings-page";

describe("SettingsPage", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText
      }
    });

    window.skillsManager = {
      clearGitHubToken: vi.fn().mockResolvedValue({ github: { hasToken: false } }),
      getAppStoragePaths: vi.fn().mockResolvedValue({
        databasePath: "/Users/andrew/Library/Application Support/Skillport/skills-manager.sqlite",
        localCachePath: "/Users/andrew/.skills-manager/cache"
      }),
      getAppSettings: vi.fn().mockResolvedValue({ github: { hasToken: true } }),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: [] }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
      openExternalUrl: vi.fn().mockResolvedValue(undefined),
      platform: "win32",
      resetLocalDatabase: vi.fn().mockResolvedValue({
        settings: { github: { hasToken: false } },
        storage: {
          databasePath: "/Users/andrew/Library/Application Support/Skillport/skills-manager.sqlite",
          localCachePath: "/Users/andrew/.skills-manager/cache"
        }
      }),
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

  it("shows copyable local cache and database paths", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("/Users/andrew/.skills-manager/cache")).toBeInTheDocument();
    expect(
      screen.getByText("/Users/andrew/Library/Application Support/Skillport/skills-manager.sqlite")
    ).toBeInTheDocument();

    const copyPathButtons = screen.getAllByRole("button", { name: "复制路径" });

    expect(copyPathButtons).toHaveLength(2);

    fireEvent.click(copyPathButtons[0]);
    expect(writeText).toHaveBeenCalledWith("/Users/andrew/.skills-manager/cache");

    fireEvent.click(copyPathButtons[1]);
    expect(writeText).toHaveBeenCalledWith(
      "/Users/andrew/Library/Application Support/Skillport/skills-manager.sqlite"
    );
  });

  it("requires confirmation before rebuilding the local database", async () => {
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "重建本地数据库" }));

    const dialog = await screen.findByRole("alertdialog", { name: "重建本地数据库？" });
    expect(dialog).toHaveTextContent(
      "会清空本地索引、来源、Skills、同步历史和应用设置，但不会删除已安装到 agent 目标目录的文件，也不会清空本地缓存目录。"
    );
    expect(window.skillsManager?.resetLocalDatabase).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认重建" }));

    await waitFor(() => expect(window.skillsManager?.resetLocalDatabase).toHaveBeenCalled());
    expect(screen.getByText("本地数据库已重建。")).toBeInTheDocument();
    expect(screen.getByText("未配置")).toBeInTheDocument();
  });
});
