import { PageLayout } from "@/components/layout/page-layout";
import React from "react";
import { useTranslation } from "react-i18next";

import { RecommendedPageMain } from "./components/recommended-page-main";
import { RecommendedPageProvider } from "./components/recommended-page-context";
import { RecommendedPageSider } from "./components/recommended-page-sider";
import { useRecommendedPageState } from "./hooks/use-recommended-page-state";

export const RecommendedPage = () => {
  const { t } = useTranslation();
  const page = useRecommendedPageState();

  return (
    <RecommendedPageProvider state={page}>
      <PageLayout
        Main={RecommendedPageMain}
        Sider={RecommendedPageSider}
        siderLabel={t("recommended.detail.ariaLabel")}
      />
    </RecommendedPageProvider>
  );
};
