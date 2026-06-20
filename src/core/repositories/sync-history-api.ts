import type { RepositoryScanSummary } from "./repository-api";

export type SourceSyncRunStatus = "failed" | "interrupted" | "running" | "success";

export type SourceSyncRunRecord = {
  endCommitSha: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  id: string;
  logPath: string | null;
  repositoryId: string;
  repositoryName: string;
  repositoryRemoteUrl: string;
  scan: RepositoryScanSummary;
  startCommitSha: string | null;
  startedAt: string;
  status: SourceSyncRunStatus;
  summaryJson: string;
};

export type SyncHistoryListResult = {
  syncRuns: SourceSyncRunRecord[];
};
