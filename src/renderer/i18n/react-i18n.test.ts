import { describe, expect, it } from "vitest";

import { createI18nInstance } from "./react-i18n";

describe("createI18nInstance", () => {
  it("uses Chinese UI copy by default", async () => {
    const i18n = await createI18nInstance("zh-CN");

    expect(i18n.t("shell.navigation.workspace")).toBe("工作区");
    expect(i18n.t("skills.actions.addSkill")).toBe("新增");
    expect(i18n.t("skills.actions.editSkill")).toBe("编辑");
  });

  it("keeps Chinese sort option labels to two characters", async () => {
    const i18n = await createI18nInstance("zh-CN");

    const sortLabels = [
      i18n.t("skills.filters.sortRecommended"),
      i18n.t("skills.filters.sortName"),
      i18n.t("skills.filters.sortRepository"),
      i18n.t("providers.filters.sortPriority"),
      i18n.t("providers.filters.sortName"),
      i18n.t("providers.filters.sortStatus"),
      i18n.t("providers.filters.sortProvider"),
      i18n.t("repositories.filters.sortPriority"),
      i18n.t("repositories.filters.sortName"),
      i18n.t("repositories.filters.sortProvider"),
      i18n.t("repositories.filters.sortStatus"),
      i18n.t("repositories.filters.sortSkills")
    ];

    expect(sortLabels).toEqual([
      "推荐",
      "名称",
      "仓库",
      "优先",
      "名称",
      "状态",
      "类型",
      "优先",
      "名称",
      "类型",
      "状态",
      "技能"
    ]);
    expect(sortLabels.every((label) => Array.from(label).length === 2)).toBe(true);
  });

  it("can initialize English UI copy", async () => {
    const i18n = await createI18nInstance("en-US");

    expect(i18n.t("shell.navigation.workspace")).toBe("Workspace");
    expect(i18n.t("skills.actions.addSkill")).toBe("Add skill");
  });
});
