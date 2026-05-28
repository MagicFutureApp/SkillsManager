import { describe, expect, it } from "vitest";

import { createI18nInstance } from "./react-i18n";

describe("createI18nInstance", () => {
  it("uses Chinese UI copy by default", async () => {
    const i18n = await createI18nInstance("zh-CN");

    expect(i18n.t("shell.navigation.workspace")).toBe("工作区");
    expect(i18n.t("skills.actions.addSkill")).toBe("新增技能");
  });

  it("can initialize English UI copy", async () => {
    const i18n = await createI18nInstance("en-US");

    expect(i18n.t("shell.navigation.workspace")).toBe("Workspace");
    expect(i18n.t("skills.actions.addSkill")).toBe("Add skill");
  });
});
