import { LoaderCircle } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { useSyncHistoryPageContext } from "./sync-history-page-context";
import { SyncHistoryFilters } from "./sync-history-filters";
import { SyncHistoryList } from "./sync-history-list";

export const SyncHistoryPageMain = () => {
  const { t } = useTranslation();
  const page = useSyncHistoryPageContext();

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight">{t("syncHistory.heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("syncHistory.description")}
            </p>
          </div>
        </div>
      </header>

      <SyncHistoryFilters
        query={page.query}
        sort={page.sort}
        status={page.statusFilter}
        onQueryChange={page.setQuery}
        onSortChange={page.setSort}
        onStatusChange={page.setStatusFilter}
      />

      <div className="mt-5">
        {page.isLoading ? (
          <section className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-9 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            {t("syncHistory.loading")}
          </section>
        ) : page.error ? (
          <section className="rounded-xl border border-border bg-card px-4 py-9 text-center text-sm text-destructive">
            {page.error}
          </section>
        ) : (
          <SyncHistoryList
            empty={t("syncHistory.empty")}
            runs={page.visibleRuns}
            selectedRunId={page.selectedRunId}
            onSelectRun={page.setSelectedRunId}
          />
        )}
      </div>
    </>
  );
};
