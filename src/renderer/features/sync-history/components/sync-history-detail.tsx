import { DetailRow } from "@/components/detail-row";
import React from "react";
import { useTranslation } from "react-i18next";

import {
  formatSyncHistoryDateTime,
  formatSyncHistoryDuration,
  type SyncHistoryRun
} from "./sync-history-data";
import { SyncHistoryStatusBadge } from "./sync-history-status-badge";

export const SyncHistoryDetail = ({ run }: { run: SyncHistoryRun | null }) => {
  const { t } = useTranslation();

  if (!run) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{t("syncHistory.detail.emptyTitle")}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("syncHistory.detail.emptyDescription")}
        </p>
      </section>
    );
  }

  const noValue = t("syncHistory.detail.noValue");

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-xl font-semibold">{run.repositoryName}</h2>
          <SyncHistoryStatusBadge status={run.status} />
        </div>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          {run.repositoryRemoteUrl}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{t("syncHistory.detail.repository")}</h3>
        <div className="mt-3 grid gap-2">
          <DetailRow
            label={t("syncHistory.detail.startedAt")}
            value={formatSyncHistoryDateTime(run.startedAt)}
          />
          <DetailRow
            label={t("syncHistory.detail.finishedAt")}
            value={formatSyncHistoryDateTime(run.finishedAt)}
          />
          <DetailRow
            label={t("syncHistory.detail.duration")}
            value={formatSyncHistoryDuration(run)}
          />
          <DetailRow
            label={t("syncHistory.detail.startCommit")}
            value={run.startCommitSha ?? noValue}
            mono
            breakMode="all"
          />
          <DetailRow
            label={t("syncHistory.detail.endCommit")}
            value={run.endCommitSha ?? noValue}
            mono
            breakMode="all"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{t("syncHistory.detail.scanHeading")}</h3>
        <div className="mt-3 grid gap-2">
          <MetricRow label={t("syncHistory.detail.scanAdded")} value={run.scan.added} />
          <MetricRow label={t("syncHistory.detail.scanChanged")} value={run.scan.changed} />
          <MetricRow label={t("syncHistory.detail.scanRemoved")} value={run.scan.removed} />
          <MetricRow label={t("syncHistory.detail.scanWarnings")} value={run.scan.warnings} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{t("syncHistory.detail.errorMessage")}</h3>
        <p className="mt-3 break-words rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
          {run.errorMessage ?? noValue}
        </p>
        <div className="mt-3 grid gap-2">
          <DetailRow label={t("syncHistory.detail.logPath")} value={run.logPath ?? noValue} mono />
        </div>
      </section>
    </>
  );
};

const MetricRow = ({ label, value }: { label: string; value: number }) => {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
      <span className="text-sm font-medium">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
};
