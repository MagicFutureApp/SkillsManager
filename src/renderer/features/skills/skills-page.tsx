import { PageLayout } from "@/components/layout/page-layout";
import React from "react";
import { useTranslation } from "react-i18next";

import { SkillsPageMain } from "./components/skills-page-main";
import { SkillsPageProvider } from "./components/skills-page-context";
import { SkillsPageSider } from "./components/skills-page-sider";
import { useSkillsPageState } from "./hooks/use-skills-page-state";

export const SkillsPage = () => {
  const { t } = useTranslation();
  const page = useSkillsPageState();

  return (
    <SkillsPageProvider state={page}>
      <PageLayout
        Main={SkillsPageMain}
        Sider={SkillsPageSider}
        siderLabel={t("skills.detail.ariaLabel")}
      />
    </SkillsPageProvider>
  );
};
