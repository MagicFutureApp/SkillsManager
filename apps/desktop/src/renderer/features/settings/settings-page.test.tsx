import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { SettingsPage } from "./settings-page";
import { GITHUB_TOKEN_HELP_URL, OFFICIAL_SITE_URL } from "../../../core/app-constants";

describe("SettingsPage", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  const clickSettingsNavigationLink = (name: string) => {
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });
    fireEvent.click(within(settingsNavigation).getByRole("link", { name }));
  };

  const revealDataReset = () => {
    for (let press = 0; press < 4; press += 1) {
      fireEvent.keyDown(window, { key: "Shift" });
    }
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

  it("shows the GitHub token field without the removed panel copy or saved token value", async () => {
    render(<SettingsPage />);

    const tokenInput = await screen.findByLabelText("GitHub token", { selector: "input" });
    expect(tokenInput).toHaveValue("");
    await waitFor(() => expect(tokenInput).toHaveAttribute("placeholder", "********"));
    expect(screen.queryByText("已配置")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "凭证管理", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText("管理 Skills Manager 访问代码托管平台所需的凭证。")
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "GitHub token" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GitHub token", level: 3 })).toBeInTheDocument();
    expect(
      screen.queryByText("用于解析 GitHub repo metadata 和 tree API，避免未认证请求的低频率限制。")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("当前 token 不会回显，输入新 token 后保存即可替换。")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("建议使用 fine-grained token，并授予 Metadata read 与 Contents read。")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看 GitHub token 创建帮助" })).toBeInTheDocument();
    expect(window.skillsManager?.getAppSettings).toHaveBeenCalled();
  });

  it("opens the landing GitHub token help page", async () => {
    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "查看 GitHub token 创建帮助" }));

    expect(window.skillsManager?.openExternalUrl).toHaveBeenCalledWith(GITHUB_TOKEN_HELP_URL);
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
    expect(within(settingsNavigation).getByRole("link", { name: "凭证管理" })).toHaveAttribute(
      "href",
      "#/settings#github-token"
    );
    expect(within(settingsNavigation).getByRole("link", { name: "技能分发" })).toHaveAttribute(
      "href",
      "#/settings#skill-distribution"
    );
    expect(within(settingsNavigation).getByRole("link", { name: "本地存储" })).toHaveAttribute(
      "href",
      "#/settings#local-storage"
    );
    expect(
      within(settingsNavigation).queryByRole("link", { name: "如何创建 GitHub token" })
    ).not.toBeInTheDocument();
    expect(
      within(settingsNavigation).queryByRole("link", { name: "数据重置" })
    ).not.toBeInTheDocument();
    expect(within(settingsNavigation).getByRole("link", { name: "关于" })).toHaveAttribute(
      "href",
      "#/settings#settings-about"
    );
    expect(screen.queryByRole("heading", { name: "凭据状态" })).not.toBeInTheDocument();
    expect(screen.queryByText("安全提示")).not.toBeInTheDocument();
    expect(
      screen.queryByText("保存后的 token 不会回显到界面，也不会离开本机应用设置。")
    ).not.toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "凭证管理", level: 2 })).toBeInTheDocument();
    expect(
      within(main).getByRole("heading", { name: "GitHub token", level: 3 })
    ).toBeInTheDocument();
    expect(within(main).getByLabelText("GitHub token", { selector: "input" })).toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "数据重置" })).not.toBeInTheDocument();

    clickSettingsNavigationLink("关于");

    expect(screen.queryByRole("heading", { name: "关于", level: 1 })).not.toBeInTheDocument();
  });

  it("reveals data reset only after four consecutive Shift presses", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });

    for (let press = 0; press < 3; press += 1) {
      fireEvent.keyDown(window, { key: "Shift" });
    }

    expect(
      within(settingsNavigation).queryByRole("link", { name: "数据重置" })
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Shift" });

    expect(within(settingsNavigation).getByRole("link", { name: "数据重置" })).toHaveAttribute(
      "href",
      "#/settings#settings-data-reset"
    );
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
    expect(
      within(aboutSection).getByRole("button", {
        name: "访问 Skills Manager 官方网站 https://sk.magicfuture.app"
      })
    ).toBeInTheDocument();
  });

  it("opens the official website when the about link is clicked", async () => {
    window.history.replaceState(null, "", "/#/settings#settings-about");
    render(<SettingsPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "访问 Skills Manager 官方网站 https://sk.magicfuture.app"
      })
    );

    expect(window.skillsManager?.openExternalUrl).toHaveBeenCalledWith(OFFICIAL_SITE_URL);
  });

  it("updates the selected internal settings navigation item after clicking it", async () => {
    render(<SettingsPage />);

    await screen.findByRole("main");
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });
    const githubTokenLink = within(settingsNavigation).getByRole("link", {
      name: "凭证管理"
    });
    revealDataReset();
    const dataResetLink = within(settingsNavigation).getByRole("link", { name: "数据重置" });
    const aboutLink = within(settingsNavigation).getByRole("link", { name: "关于" });

    expect(githubTokenLink).toHaveAttribute("aria-current", "location");
    expect(dataResetLink).not.toHaveAttribute("aria-current");
    expect(aboutLink).not.toHaveAttribute("aria-current");

    fireEvent.click(dataResetLink);

    expect(dataResetLink).toHaveAttribute("aria-current", "location");
    expect(githubTokenLink).not.toHaveAttribute("aria-current");

    fireEvent.click(aboutLink);

    expect(aboutLink).toHaveAttribute("aria-current", "location");
    expect(dataResetLink).not.toHaveAttribute("aria-current");
    expect(window.location.hash).toBe("#/settings#settings-about");
  });

  it("only renders the currently selected internal settings section", async () => {
    render(<SettingsPage />);

    const main = await screen.findByRole("main");
    const settingsNavigation = screen.getByRole("navigation", { name: "设置页面导航" });

    expect(within(main).getByLabelText("GitHub token", { selector: "input" })).toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "技能分发" })).not.toBeInTheDocument();
    expect(within(main).queryByRole("region", { name: "关于" })).not.toBeInTheDocument();

    fireEvent.click(within(settingsNavigation).getByRole("link", { name: "关于" }));

    expect(within(main).getByRole("region", { name: "关于" })).toBeInTheDocument();
    expect(
      within(main).queryByRole("heading", { name: "GitHub API token" })
    ).not.toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "数据重置" })).not.toBeInTheDocument();

    revealDataReset();
    fireEvent.click(within(settingsNavigation).getByRole("link", { name: "数据重置" }));

    expect(within(main).getByRole("heading", { name: "数据重置", level: 2 })).toBeInTheDocument();
    expect(within(main).queryByRole("region", { name: "关于" })).not.toBeInTheDocument();
  });

  it("saves a new GitHub token and clears the input", async () => {
    render(<SettingsPage />);

    const tokenInput = await screen.findByLabelText("GitHub token", { selector: "input" });
    fireEvent.change(tokenInput, { target: { value: "  github_pat_new  " } });
    const saveButton = screen.getByRole("button", { name: "保存" });
    expect(saveButton.querySelector("svg")).not.toBeInTheDocument();
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(window.skillsManager?.saveGitHubToken).toHaveBeenCalledWith("github_pat_new")
    );
    expect(tokenInput).toHaveValue("");
    expect(screen.getByText("已保存 GitHub token。")).toBeInTheDocument();
  });

  it("clears the saved GitHub token", async () => {
    render(<SettingsPage />);

    const tokenInput = await screen.findByLabelText("GitHub token", { selector: "input" });
    const clearButton = await screen.findByRole("button", { name: "清除" });
    expect(clearButton.querySelector("svg")).not.toBeInTheDocument();
    fireEvent.click(clearButton);

    await waitFor(() => expect(window.skillsManager?.clearGitHubToken).toHaveBeenCalled());
    expect(tokenInput).toHaveValue("");
    await waitFor(() =>
      expect(tokenInput).toHaveAttribute("placeholder", "请输入 GitHub Token")
    );
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
    revealDataReset();
    clickSettingsNavigationLink("数据重置");
    fireEvent.click(await screen.findByRole("button", { name: "重建本地数据库" }));

    const dialog = await screen.findByRole("alertdialog", { name: "重建本地数据库？" });
    expect(dialog).toHaveTextContent(
      "会清空本地索引、来源、Skills 和应用设置，但不会删除已安装到 agent 目标目录的文件，也不会清空本地缓存目录。"
    );
    expect(window.skillsManager?.resetLocalDatabase).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认重建" }));

    await waitFor(() => expect(window.skillsManager?.resetLocalDatabase).toHaveBeenCalled());
    expect(screen.getByText("本地数据库已重建。")).toBeInTheDocument();
    clickSettingsNavigationLink("凭证管理");
    expect(screen.getByLabelText("GitHub token", { selector: "input" })).toHaveValue("");
  });
});
