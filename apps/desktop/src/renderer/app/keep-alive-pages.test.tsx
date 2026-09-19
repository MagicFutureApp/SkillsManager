import { RouterProvider } from "@tanstack/react-router";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { I18nextProvider } from "react-i18next";

import { TooltipProvider } from "@/components/ui/tooltip";
import { createI18nInstance } from "@/i18n/react-i18n";
import type { TargetsListResult } from "@/global";
import {
  providerApiRecordsFixture,
  repositoryApiRecordsFixture,
  skillApiRecordsFixture
} from "@/test/api-fixtures";

import { KEEP_ALIVE_ENABLED, getKeepAlivePageTestId } from "./keep-alive-pages";
import { router } from "./router";
import { useDataStore } from "@/stores/data-store";

const targetsFixture: TargetsListResult = {
  registeredTargets: []
};

const renderApp = async () => {
  const i18n = await createI18nInstance("zh-CN");

  render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </I18nextProvider>
  );
};

const searchSkills = async (keyword: string) => {
  await screen.findByLabelText("搜索技能");
  fireEvent.change(screen.getByLabelText("搜索技能"), { target: { value: keyword } });

  return screen.getByTestId(getKeepAlivePageTestId("skills"));
};

const navigateTo = async (to: "/skills" | "/targets") => {
  await act(async () => {
    await router.navigate({ to });
  });
};

describe("KeepAlivePages", () => {
  beforeEach(async () => {
    window.skillsManager = {
      getAppSettings: vi.fn().mockResolvedValue({ autoDistributeOnSync: false }),
      getHealth: vi.fn().mockResolvedValue({
        chrome: "130.0.0",
        electron: "42.2.0",
        node: "25.0.0",
        platform: "win32"
      }),
      getInfo: vi.fn().mockResolvedValue({ version: "9.8.7" }),
      getLocale: vi.fn().mockResolvedValue("zh-CN"),
      getNavigationBadgeCounts: vi.fn().mockResolvedValue({ counts: {} }),
      listProviders: vi.fn().mockResolvedValue({ providers: providerApiRecordsFixture }),
      listRepositories: vi.fn().mockResolvedValue({ repositories: repositoryApiRecordsFixture }),
      listSkills: vi.fn().mockResolvedValue({ skills: skillApiRecordsFixture }),
      listTargets: vi.fn().mockResolvedValue(targetsFixture),
      platform: "win32"
    };

    // 重置跨 tab 共享的数据桶，保证每个用例都是从 idle 状态由页面挂载触发加载，
    // 而不是复用上一个用例留下的 ready 状态（否则 listSkills/listTargets 不会被再次调用）。
    useDataStore.getState().reset();

    await router.navigate({ replace: true, to: "/skills" });
  });

  // 两组用例互斥，由 `KEEP_ALIVE_ENABLED` 决定哪一组生效，翻开关即换覆盖目标。
  describe.runIf(KEEP_ALIVE_ENABLED)("keep-alive 开启", () => {
    it("keeps visited page state mounted when switching tabs", async () => {
      await renderApp();
      const skillsPage = await searchSkills("Review Bot");

      expect(skillsPage).not.toHaveAttribute("hidden");
      expect(screen.queryByTestId(getKeepAlivePageTestId("targets"))).not.toBeInTheDocument();

      await navigateTo("/targets");

      expect(screen.getByTestId(getKeepAlivePageTestId("skills"))).toBe(skillsPage);
      expect(skillsPage).toHaveAttribute("hidden");
      expect(screen.getByTestId(getKeepAlivePageTestId("targets"))).not.toHaveAttribute("hidden");
      expect(screen.getByRole("complementary", { name: "目标详情" })).toBeInTheDocument();

      await navigateTo("/skills");

      expect(screen.getByTestId(getKeepAlivePageTestId("skills"))).toBe(skillsPage);
      expect(skillsPage).not.toHaveAttribute("hidden");
      expect(screen.getByLabelText("搜索技能")).toHaveValue("Review Bot");
    });

    it("loads each visited page once and keeps it mounted afterwards", async () => {
      await renderApp();
      await screen.findByLabelText("搜索技能");

      expect(window.skillsManager?.listSkills).toHaveBeenCalledTimes(1);
      expect(window.skillsManager?.listTargets).toHaveBeenCalledTimes(1);

      await navigateTo("/targets");
      await navigateTo("/skills");

      expect(window.skillsManager?.listSkills).toHaveBeenCalledTimes(1);
    });

    it("keeps page UI state while reflecting data mutated on another tab", async () => {
      await renderApp();
      const skillsPage = await searchSkills("Review Bot");

      await navigateTo("/targets");

      // 模拟另一个 tab（Targets）对共享数据桶的 mutation：新增一个 target。
      act(() => {
        useDataStore.getState().setRegisteredTargets([
          {
            createdAt: "2026-06-21T00:00:00.000Z",
            enabled: true,
            id: "codex",
            name: "Codex",
            normalizedPath: "/Users/test/.codex/skills",
            path: "/Users/test/.codex/skills",
            scanMessage: null,
            selectedSkills: [],
            skillPreferences: [],
            skillCount: 0,
            scope: "global",
            status: "registered",
            type: "codex",
            updatedAt: "2026-06-21T00:00:00.000Z"
          }
        ]);
      });

      await navigateTo("/skills");

      // 保留自身 UI 状态（查询词）。
      expect(skillsPage).not.toHaveAttribute("hidden");
      expect(screen.getByLabelText("搜索技能")).toHaveValue("Review Bot");
      // 反映其它 tab 改动后的最新数据，而非停留在旧快照。
      expect(screen.getByLabelText("选择 Codex")).toBeInTheDocument();
    });
  });

  describe.runIf(!KEEP_ALIVE_ENABLED)("keep-alive 短路口", () => {
    it("unmounts the previous page instead of keeping it hidden", async () => {
      await renderApp();
      const skillsPage = await searchSkills("Review Bot");

      await navigateTo("/targets");

      expect(screen.queryByTestId(getKeepAlivePageTestId("skills"))).not.toBeInTheDocument();
      expect(screen.getByTestId(getKeepAlivePageTestId("targets"))).toBeInTheDocument();
      expect(screen.getByRole("complementary", { name: "目标详情" })).toBeInTheDocument();

      await navigateTo("/skills");
      await screen.findByLabelText("搜索技能");

      expect(screen.getByTestId(getKeepAlivePageTestId("skills"))).not.toBe(skillsPage);
      expect(screen.getByLabelText("搜索技能")).toHaveValue("");
      expect(window.skillsManager?.listSkills).toHaveBeenCalledTimes(2);
    });
  });
});
