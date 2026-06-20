import { Badge } from "@/components/ui/badge";
import React from "react";
import { useTranslation } from "react-i18next";

import type { SyncHistoryRun } from "./sync-history-data";

export const SyncHistoryStatusBadge = ({ status }: { status: SyncHistoryRun["status"] }) => {
  const { t } = useTranslation();

  return (
    <Badge variant={status === "failed" || status === "interrupted" ? "destructive" : "outline"}>
      {t(`syncHistory.status.${status}`)}
    </Badge>
  );
};
