import React from "react";

import { SyncHistoryDetail } from "./sync-history-detail";
import { useSyncHistoryPageContext } from "./sync-history-page-context";

export const SyncHistoryPageSider = () => {
  const page = useSyncHistoryPageContext();

  return <SyncHistoryDetail run={page.selectedRun} />;
};
