import { PageLayout } from "@/components/layout/page-layout";
import React from "react";
import { useTranslation } from "react-i18next";

import { SyncHistoryPageMain } from "./components/sync-history-page-main";
import { SyncHistoryPageProvider } from "./components/sync-history-page-context";
import { SyncHistoryPageSider } from "./components/sync-history-page-sider";
import { useSyncHistoryPageState } from "./hooks/use-sync-history-page-state";

export const SyncHistoryPage = () => {
  const { t } = useTranslation();
  const page = useSyncHistoryPageState();

  return (
    <SyncHistoryPageProvider state={page}>
      <PageLayout
        Main={SyncHistoryPageMain}
        Sider={SyncHistoryPageSider}
        siderLabel={t("syncHistory.detail.ariaLabel")}
      />
    </SyncHistoryPageProvider>
  );
};
