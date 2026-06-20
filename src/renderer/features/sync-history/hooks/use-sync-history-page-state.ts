import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  filterSyncHistoryRuns,
  type SyncHistoryRun,
  type SyncHistorySort,
  type SyncHistoryStatusFilter
} from "../components/sync-history-data";

export const useSyncHistoryPageState = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [runs, setRuns] = useState<SyncHistoryRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [sort, setSort] = useState<SyncHistorySort>("newest");
  const [statusFilter, setStatusFilter] = useState<SyncHistoryStatusFilter>("all");

  useEffect(() => {
    let isMounted = true;

    const loadSyncHistory = async () => {
      setError("");
      setIsLoading(true);

      try {
        if (!window.skillsManager?.listSyncHistory) {
          throw new Error(t("syncHistory.error"));
        }

        const result = await window.skillsManager.listSyncHistory();

        if (!isMounted) {
          return;
        }

        setRuns(result.syncRuns);
        setSelectedRunId((currentId) => currentId ?? result.syncRuns[0]?.id ?? null);
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : t("syncHistory.error"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSyncHistory();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const visibleRuns = useMemo(() => {
    return filterSyncHistoryRuns({
      query,
      runs,
      sort,
      status: statusFilter
    });
  }, [query, runs, sort, statusFilter]);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  return {
    error,
    isLoading,
    query,
    runs,
    selectedRun,
    selectedRunId,
    sort,
    statusFilter,
    visibleRuns,
    setQuery,
    setSelectedRunId,
    setSort,
    setStatusFilter
  };
};

export type SyncHistoryPageState = ReturnType<typeof useSyncHistoryPageState>;
