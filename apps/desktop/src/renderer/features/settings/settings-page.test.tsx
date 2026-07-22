import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { SettingsPage } from "./settings-page";

describe("SettingsPage", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  const clickSettingsNavigationLink = (name: string) => {
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });
    fireEvent.click(within(settingsNavigation).getByRole("link", { name }));
  };

  beforeEach(() => {
    writeText.mockClear();
    window.history.replaceState(null, "", "/#/settings");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText
      }
    });

    window.skillsManager = {
      clearGitHubToken: vi.fn().mockResolvedValue({
        distribution: { autoDistributeOnSync: false },
        github: { hasToken: false }
      }),
      getAppStoragePaths: vi.fn().mockResolvedValue({
        databasePath:
          "/Users/andrew/Library/Application Support/Skills Manager/skills-manager.sqlite",
        localCachePath: "/Users/andrew/.skills-manager/cache"
      }),
      getAppSettings: vi.fn().mockResolvedValue({
        distribution: { autoDistributeOnSync: false },
        github: { hasToken: true }
      }),
      getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
      getInfo: vi.fn().mockResolvedValue({ version: "0.1.0" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      listProviders: vi.fn().mockResolvedValue({ providers: [] }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: [] }),
      openExternalUrl: vi.fn().mockResolvedValue(undefined),
      platform: "win32",
      resetLocalDatabase: vi.fn().mockResolvedValue({
        settings: {
          distribution: { autoDistributeOnSync: false },
          github: { hasToken: false }
        },
        storage: {
          databasePath:
            "/Users/andrew/Library/Application Support/Skills Manager/skills-manager.sqlite",
          localCachePath: "/Users/andrew/.skills-manager/cache"
        }
      }),
      saveGitHubToken: vi.fn().mockResolvedValue({
        distribution: { autoDistributeOnSync: false },
        github: { hasToken: true }
      }),
      updateDistributionSettings: vi.fn().mockResolvedValue({
        distribution: { autoDistributeOnSync: true },
        github: { hasToken: true }
      })
    };
  });

  it("shows GitHub token status without rendering the saved token value", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("已配置")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub token")).toHaveValue("");
    expect(
      screen.getByText("当前 token 不会回显，输入新 token 后保存即可替换。")
    ).toBeInTheDocument();
    expect(window.skillsManager?.getAppSettings).toHaveBeenCalled();
  });

  it("shows GitHub token creation help from the internal settings navigation", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    clickSettingsNavigationLink("如何创建 GitHub token");

    expect(
      screen.getByRole("heading", { name: "如何创建 GitHub token", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Fine-grained personal access token/)).toBeInTheDocument();
    expect(screen.getByText("Contents: Read-only")).toBeInTheDocument();
    expect(screen.getByText("Metadata: Read-only")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "打开 GitHub token 创建页面" })
    ).not.toBeInTheDocument();
  });

  it("uses the standard app layout with an internal settings navigation", async () => {
    render(<SettingsPage />);

    const main = await screen.findByRole("main");
    const settingsSidebar = screen.getByRole("complementary", { name: "设置页面侧边栏" });
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });
    const settingsLayout = main.parentElement;

    expect(main).toHaveAttribute("aria-label", "设置内容");
    expect(main).not.toHaveAttribute("aria-labelledby");
    expect(main).toHaveClass("h-[calc(100svh-44px)]", "overflow-y-auto");
    expect(settingsLayout).toHaveClass("h-full", "overflow-hidden");
    expect(
      screen.queryByRole("heading", { name: "GitHub API token", level: 1 })
    ).not.toBeInTheDocument();
    expect(
      within(main).queryByText(
        "管理 GitHub API 访问凭据和本地扫描相关设置。GitHub token 仅保存在本机设置中，不会回显到界面。"
      )
    ).not.toBeInTheDocument();
    expect(settingsSidebar).toHaveClass("sticky", "h-[calc(100svh-44px)]");
    expect(
      within(settingsNavigation).getByRole("link", { name: "GitHub API token" })
    ).toHaveAttribute("href", "#/settings#github-token");
    expect(within(settingsNavigation).getByRole("link", { name: "技能分发" })).toHaveAttribute(
      "href",
      "#/settings#skill-distribution"
    );
    expect(within(settingsNavigation).getByRole("link", { name: "本地存储" })).toHaveAttribute(
      "href",
      "#/settings#local-storage"
    );
    expect(
      within(settingsNavigation).getByRole("link", { name: "如何创建 GitHub token" })
    ).toHaveAttribute("href", "#/settings#github-token-help");
    expect(within(settingsNavigation).getByRole("link", { name: "危险操作" })).toHaveAttribute(
      "href",
      "#/settings#settings-danger-zone"
    );
    expect(within(settingsNavigation).getByRole("link", { name: "关于" })).toHaveAttribute(
      "href",
      "#/settings#settings-about"
    );
    expect(screen.getByRole("heading", { name: "凭据状态" })).toBeInTheDocument();
    expect(
      within(main).getByRole("heading", { name: "GitHub API token", level: 2 })
    ).toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "危险操作" })).not.toBeInTheDocument();

    clickSettingsNavigationLink("关于");

    expect(screen.queryByRole("heading", { name: "关于", level: 1 })).not.toBeInTheDocument();
  });

  it("shows an about section with the logo and app version", async () => {
    window.history.replaceState(null, "", "/#/settings#settings-about");
    render(<SettingsPage />);

    await screen.findByRole("main");
    const aboutSection = screen.getByRole("region", { name: "关于" });

    expect(aboutSection).toHaveClass(
      "flex",
      "min-h-[calc(100svh-100px)]",
      "items-center",
      "justify-center",
      "text-center"
    );
    expect(aboutSection).not.toHaveClass("rounded-xl", "border", "border-border", "bg-card");
    const skillsManagerMark = within(aboutSection).getByRole("img", {
      name: "Skills Manager logo"
    });

    expect(skillsManagerMark).toHaveClass("size-16");
    expect(within(aboutSection).getByText("Skills Manager")).toBeInTheDocument();
    expect(within(aboutSection).getByText("Sync and distribute agent skills")).toBeInTheDocument();
    expect(await within(aboutSection).findByText("版本 0.1.0")).toBeInTheDocument();
    expect(window.skillsManager?.getInfo).toHaveBeenCalled();
  });

  it("updates the selected internal settings navigation item after clicking it", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });
    const githubTokenLink = within(settingsNavigation).getByRole("link", {
      name: "GitHub API token"
    });
    const dangerZoneLink = within(settingsNavigation).getByRole("link", { name: "危险操作" });
    const aboutLink = within(settingsNavigation).getByRole("link", { name: "关于" });

    expect(githubTokenLink).toHaveAttribute("aria-current", "location");
    expect(dangerZoneLink).not.toHaveAttribute("aria-current");
    expect(aboutLink).not.toHaveAttribute("aria-current");

    fireEvent.click(dangerZoneLink);

    expect(dangerZoneLink).toHaveAttribute("aria-current", "location");
    expect(githubTokenLink).not.toHaveAttribute("aria-current");

    fireEvent.click(aboutLink);

    expect(aboutLink).toHaveAttribute("aria-current", "location");
    expect(dangerZoneLink).not.toHaveAttribute("aria-current");
    expect(window.location.hash).toBe("#/settings#settings-about");
  });

  it("only renders the currently selected internal settings section", async () => {
    render(<SettingsPage />);

    const main = await screen.findByRole("main");
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });

    expect(
      within(main).getByRole("heading", { name: "GitHub API token", level: 2 })
    ).toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "技能分发" })).not.toBeInTheDocument();
    expect(within(main).queryByRole("region", { name: "关于" })).not.toBeInTheDocument();

    fireEvent.click(within(settingsNavigation).getByRole("link", { name: "关于" }));

    expect(within(main).getByRole("region", { name: "关于" })).toBeInTheDocument();
    expect(
      within(main).queryByRole("heading", { name: "GitHub API token" })
    ).not.toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "危险操作" })).not.toBeInTheDocument();

    fireEvent.click(within(settingsNavigation).getByRole("link", { name: "危险操作" }));

    expect(within(main).getByRole("heading", { name: "危险操作", level: 2 })).toBeInTheDocument();
    expect(within(main).queryByRole("region", { name: "关于" })).not.toBeInTheDocument();
  });

  it("opens the GitHub token creation page through the system browser", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    clickSettingsNavigationLink("如何创建 GitHub token");
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

    await screen.findByRole("main");
    clickSettingsNavigationLink("本地存储");

    expect(await screen.findByText("/Users/andrew/.skills-manager/cache")).toBeInTheDocument();
    expect(
      screen.getByText(
        "/Users/andrew/Library/Application Support/Skills Manager/skills-manager.sqlite"
      )
    ).toBeInTheDocument();

    const copyPathButtons = screen.getAllByRole("button", { name: "复制路径" });

    expect(copyPathButtons).toHaveLength(2);

    fireEvent.click(copyPathButtons[0]);
    expect(writeText).toHaveBeenCalledWith("/Users/andrew/.skills-manager/cache");

    fireEvent.click(copyPathButtons[1]);
    expect(writeText).toHaveBeenCalledWith(
      "/Users/andrew/Library/Application Support/Skills Manager/skills-manager.sqlite"
    );
  });

  it("shows automatic distribution disabled by default and saves switch changes", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    clickSettingsNavigationLink("技能分发");

    const automaticDistributionSwitch = await screen.findByRole("switch", {
      name: "同步后自动分发到已设置目标"
    });

    expect(automaticDistributionSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(automaticDistributionSwitch);

    await waitFor(() =>
      expect(window.skillsManager?.updateDistributionSettings).toHaveBeenCalledWith({
        autoDistributeOnSync: true
      })
    );
    expect(automaticDistributionSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("requires confirmation before rebuilding the local database", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    clickSettingsNavigationLink("危险操作");
    fireEvent.click(await screen.findByRole("button", { name: "重建本地数据库" }));

    const dialog = await screen.findByRole("alertdialog", { name: "重建本地数据库？" });
    expect(dialog).toHaveTextContent(
      "会清空本地索引、来源、Skills 和应用设置，但不会删除已安装到 agent 目标目录的文件，也不会清空本地缓存目录。"
    );
    expect(window.skillsManager?.resetLocalDatabase).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认重建" }));

    await waitFor(() => expect(window.skillsManager?.resetLocalDatabase).toHaveBeenCalled());
    expect(screen.getByText("本地数据库已重建。")).toBeInTheDocument();
    clickSettingsNavigationLink("GitHub API token");
    expect(screen.getByText("未配置")).toBeInTheDocument();
  });
});
