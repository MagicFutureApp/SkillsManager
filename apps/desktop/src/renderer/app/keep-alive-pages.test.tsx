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

import { getKeepAlivePageTestId } from "./keep-alive-pages";
import { router } from "./router";

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

    await router.navigate({ replace: true, to: "/skills" });
  });

  it("keeps visited page state mounted when switching tabs", async () => {
    await renderApp();
    await screen.findByLabelText("搜索技能");

    fireEvent.change(screen.getByLabelText("搜索技能"), { target: { value: "Release Notes" } });

    const skillsPage = screen.getByTestId(getKeepAlivePageTestId("skills"));

    expect(skillsPage).not.toHaveAttribute("hidden");
    expect(screen.queryByTestId(getKeepAlivePageTestId("targets"))).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate({ to: "/targets" });
    });

    expect(screen.getByTestId(getKeepAlivePageTestId("skills"))).toBe(skillsPage);
    expect(skillsPage).toHaveAttribute("hidden");
    expect(screen.getByTestId(getKeepAlivePageTestId("targets"))).not.toHaveAttribute("hidden");
    expect(screen.getByRole("complementary", { name: "目标详情" })).toBeInTheDocument();

    await act(async () => {
      await router.navigate({ to: "/skills" });
    });

    expect(screen.getByTestId(getKeepAlivePageTestId("skills"))).toBe(skillsPage);
    expect(skillsPage).not.toHaveAttribute("hidden");
    expect(screen.getByLabelText("搜索技能")).toHaveValue("Release Notes");
  });

  it("loads each visited page once and keeps it mounted afterwards", async () => {
    await renderApp();
    await screen.findByLabelText("搜索技能");

    expect(window.skillsManager?.listSkills).toHaveBeenCalledTimes(1);
    expect(window.skillsManager?.listTargets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await router.navigate({ to: "/targets" });
    });

    await act(async () => {
      await router.navigate({ to: "/skills" });
    });

    expect(window.skillsManager?.listSkills).toHaveBeenCalledTimes(1);
  });
});
