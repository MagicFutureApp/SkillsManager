import type { SyncHistoryListResult } from "@/global";
import { formatRepositoryDateTime } from "../../../../core/repositories/repository-utils";

export type SyncHistoryRun = SyncHistoryListResult["syncRuns"][number];
export type SyncHistoryStatusFilter = SyncHistoryRun["status"] | "all";
export type SyncHistorySort = "newest" | "repository" | "status";

export const formatSyncHistoryDateTime = formatRepositoryDateTime;

export const formatSyncHistoryDuration = (run: SyncHistoryRun): string => {
  if (!run.finishedAt) {
    return "--";
  }

  const startedAt = new Date(run.startedAt).getTime();
  const finishedAt = new Date(run.finishedAt).getTime();

  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt) || finishedAt < startedAt) {
    return "--";
  }

  const totalSeconds = Math.round((finishedAt - startedAt) / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
};

export const filterSyncHistoryRuns = ({
  query,
  runs,
  sort,
  status
}: {
  query: string;
  runs: SyncHistoryRun[];
  sort: SyncHistorySort;
  status: SyncHistoryStatusFilter;
}): SyncHistoryRun[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const visible = runs.filter((run) => {
    const searchable = [
      run.repositoryName,
      run.repositoryRemoteUrl,
      run.status,
      run.errorMessage ?? "",
      run.logPath ?? "",
      run.startCommitSha ?? "",
      run.endCommitSha ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (status === "all" || run.status === status)
    );
  });

  return [...visible].sort((first, second) => {
    if (sort === "repository") {
      return (
        first.repositoryName.localeCompare(second.repositoryName) ||
        second.startedAt.localeCompare(first.startedAt)
      );
    }

    if (sort === "status") {
      return (
        first.status.localeCompare(second.status) || second.startedAt.localeCompare(first.startedAt)
      );
    }

    return second.startedAt.localeCompare(first.startedAt);
  });
};
