import { PageLayout } from "@/components/layout/page-layout";
import React from "react";
import { useTranslation } from "react-i18next";

import { SkillsPageMain } from "./skills-page-main";
import { SkillsPageSider } from "./skills-page-sider";

export const SkillsPage = () => {
  const { t } = useTranslation();

  return (
    <PageLayout
      Main={SkillsPageMain}
      Sider={SkillsPageSider}
      siderLabel={t("skills.detail.ariaLabel")}
    />
  );
};
