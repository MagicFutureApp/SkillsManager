import { PageLayout } from "@/components/layout/page-layout";
import { ProvidersPageProvider } from "./providers-page-context";
import { ProvidersPageMain } from "./providers-page-main";
import { ProvidersPageSider } from "./providers-page-sider";
import { useProvidersPageState } from "./use-providers-page-state";
import React from "react";
import { useTranslation } from "react-i18next";

export const ProvidersPage = () => {
  const { t } = useTranslation();
  const page = useProvidersPageState();

  return (
    <ProvidersPageProvider state={page}>
      <PageLayout
        Main={ProvidersPageMain}
        Sider={ProvidersPageSider}
        siderLabel={t("providers.detail.ariaLabel")}
      />
    </ProvidersPageProvider>
  );
};
