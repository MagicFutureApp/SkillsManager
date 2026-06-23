import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow
} from "@/components/data-table";
import { shouldIgnoreRowSelection } from "@/lib/row-selection";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { formatSyncHistoryDateTime, type SyncHistoryRun } from "./sync-history-data";
import { SyncHistoryStatusBadge } from "./sync-history-status-badge";

type SyncHistoryListProps = {
  empty: string;
  runs: SyncHistoryRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
};

export const SyncHistoryList = ({
  empty,
  runs,
  selectedRunId,
  onSelectRun
}: SyncHistoryListProps) => {
  const { t } = useTranslation();

  return (
    <DataTable>
      <DataTableHeader className="max-[820px]:hidden">
        <DataTableRow>
          <DataTableHead>{t("syncHistory.table.repository")}</DataTableHead>
          <DataTableHead className="w-[176px]">{t("syncHistory.table.startedAt")}</DataTableHead>
          <DataTableHead className="w-[88px]">{t("syncHistory.table.status")}</DataTableHead>
          <DataTableHead className="w-[24%]">{t("syncHistory.table.scan")}</DataTableHead>
          <DataTableHead className="w-[18%]">{t("syncHistory.table.log")}</DataTableHead>
        </DataTableRow>
      </DataTableHeader>

      <DataTableBody>
        {runs.length === 0 ? (
          <DataTableEmptyRow colSpan={5}>{empty}</DataTableEmptyRow>
        ) : (
          runs.map((run) => (
            <DataTableRow
              key={run.id}
              className="cursor-pointer"
              selected={run.id === selectedRunId}
              onClick={(event) => {
                if (shouldIgnoreRowSelection(event)) {
                  return;
                }

                onSelectRun(run.id);
              }}
            >
              <DataTableCell className="min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={t("syncHistory.list.selectRun", {
                    repository: run.repositoryName,
                    status: t(`syncHistory.status.${run.status}`)
                  })}
                  aria-selected={run.id === selectedRunId}
                  onClick={() => onSelectRun(run.id)}
                >
                  <span className="block truncate text-sm font-semibold">{run.repositoryName}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {run.repositoryRemoteUrl}
                  </span>
                </Button>
              </DataTableCell>
              <DataTableCell className="font-mono text-sm text-muted-foreground max-[820px]:hidden">
                {formatSyncHistoryDateTime(run.startedAt)}
              </DataTableCell>
              <DataTableCell className="max-[820px]:hidden">
                <SyncHistoryStatusBadge status={run.status} />
              </DataTableCell>
              <DataTableCell className="min-w-0 truncate text-xs text-muted-foreground max-[820px]:hidden">
                <RunIcon run={run} />
                {t("syncHistory.list.scanSummary", {
                  added: run.scan.added,
                  changed: run.scan.changed,
                  removed: run.scan.removed,
                  warnings: run.scan.warnings
                })}
              </DataTableCell>
              <DataTableCell className="truncate font-mono text-xs text-muted-foreground max-[820px]:hidden">
                {run.logPath ?? t("syncHistory.detail.noValue")}
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  );
};

const RunIcon = ({ run }: { run: SyncHistoryRun }) => {
  const Icon = iconByStatus[run.status];

  return <Icon aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px]" />;
};

const iconByStatus = {
  failed: AlertCircle,
  interrupted: AlertCircle,
  running: Clock,
  success: CheckCircle2
};
