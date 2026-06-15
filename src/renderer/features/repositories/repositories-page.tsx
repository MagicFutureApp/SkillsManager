import { PageLayout } from "@/components/layout/page-layout";
import { RepositoriesPageDeleteDialog } from "./components/repositories-page-delete-dialog";
import { RepositoriesPageProvider } from "./components/repositories-page-context";
import { RepositoriesPageMain } from "./components/repositories-page-main";
import { RepositoriesPageModal } from "./components/repositories-page-modal";
import { RepositoriesPageSider } from "./components/repositories-page-sider";
import { useRepositoriesPageState } from "./hooks/use-repositories-page-state";
import React from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPage = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageState();

  return (
    <RepositoriesPageProvider state={page}>
      <PageLayout
        Main={RepositoriesPageMain}
        Sider={RepositoriesPageSider}
        siderLabel={t("repositories.detail.ariaLabel")}
      />
      <RepositoriesPageDeleteDialog />
      <RepositoriesPageModal />
    </RepositoriesPageProvider>
  );
};
