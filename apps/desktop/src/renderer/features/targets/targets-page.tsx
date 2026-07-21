import { PageLayout } from "@/components/layout/page-layout";
import React from "react";
import { useTranslation } from "react-i18next";

import { TargetsPageProvider } from "./components/targets-page-context";
import { TargetsDeleteDialog } from "./components/targets-delete-dialog";
import { TargetsEditDialog } from "./components/targets-edit-dialog";
import { TargetsPageMain } from "./components/targets-page-main";
import { TargetsPageModal } from "./components/targets-page-modal";
import { TargetsPageSider } from "./components/targets-page-sider";
import { TargetsScanLoadingDialog } from "./components/targets-scan-loading-dialog";
import { TargetsScanIssuesDialog } from "./components/targets-scan-issues-dialog";
import { useTargetsPageState } from "./hooks/use-targets-page-state";

export const TargetsPage = () => {
  const { t } = useTranslation();
  const page = useTargetsPageState();

  return (
    <TargetsPageProvider state={page}>
      <PageLayout
        Main={TargetsPageMain}
        Sider={TargetsPageSider}
        siderLabel={t("targets.detail.ariaLabel")}
      />
      <TargetsPageModal />
      <TargetsEditDialog />
      <TargetsDeleteDialog />
      <TargetsScanLoadingDialog />
      <TargetsScanIssuesDialog />
    </TargetsPageProvider>
  );
};
