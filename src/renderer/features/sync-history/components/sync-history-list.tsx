import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const gridColumnsClassName =
  "grid-cols-[minmax(0,1.35fr)_minmax(176px,0.95fr)_minmax(72px,0.38fr)_minmax(0,1.1fr)_minmax(0,0.75fr)]";

export const SyncHistoryList = ({
  empty,
  runs,
  selectedRunId,
  onSelectRun
}: SyncHistoryListProps) => {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={cn(
          "grid items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground max-[820px]:hidden",
          gridColumnsClassName
        )}
      >
        <span>{t("syncHistory.table.repository")}</span>
        <span>{t("syncHistory.table.startedAt")}</span>
        <span>{t("syncHistory.table.status")}</span>
        <span>{t("syncHistory.table.scan")}</span>
        <span>{t("syncHistory.table.log")}</span>
      </div>

      {runs.length === 0 ? (
        <div className="px-4 py-9 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        runs.map((run) => (
          <Button
            key={run.id}
            type="button"
            variant="ghost"
            className={cn(
              "grid h-auto w-full items-center gap-3 rounded-none border-b border-border px-4 py-3 text-left font-normal last:border-b-0 hover:bg-muted/50 max-[820px]:grid-cols-[minmax(0,1fr)_auto]",
              gridColumnsClassName,
              run.id === selectedRunId &&
                "bg-primary/5 shadow-[inset_3px_0_0_theme(colors.primary)]"
            )}
            aria-label={t("syncHistory.list.selectRun", {
              repository: run.repositoryName,
              status: t(`syncHistory.status.${run.status}`)
            })}
            aria-selected={run.id === selectedRunId}
            onClick={() => onSelectRun(run.id)}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{run.repositoryName}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {run.repositoryRemoteUrl}
              </span>
            </span>
            <span className="font-mono text-sm text-muted-foreground max-[820px]:hidden">
              {formatSyncHistoryDateTime(run.startedAt)}
            </span>
            <span className="max-[820px]:hidden">
              <SyncHistoryStatusBadge status={run.status} />
            </span>
            <span className="min-w-0 truncate text-xs text-muted-foreground max-[820px]:hidden">
              <RunIcon run={run} />
              {t("syncHistory.list.scanSummary", {
                added: run.scan.added,
                changed: run.scan.changed,
                removed: run.scan.removed,
                warnings: run.scan.warnings
              })}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground max-[820px]:hidden">
              {run.logPath ?? t("syncHistory.detail.noValue")}
            </span>
          </Button>
        ))
      )}
    </section>
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
