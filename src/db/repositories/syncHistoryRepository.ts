import { desc, eq } from "drizzle-orm";

import type { RepositoryScanSummary } from "../../core/repositories/repository-api";
import type {
  SourceSyncRunRecord,
  SourceSyncRunStatus
} from "../../core/repositories/sync-history-api";
import {
  EMPTY_REPOSITORY_SCAN_SUMMARY,
  normalizeRepositoryScanSummary
} from "../../core/repositories/repository-utils";
import type { createDbClient } from "../client";
import { repositories, syncRuns } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

export const createSyncHistoryRepository = (db: DbClient) => {
  return {
    async list(): Promise<SourceSyncRunRecord[]> {
      const rows = await db
        .select({
          endCommitSha: syncRuns.endCommitSha,
          errorMessage: syncRuns.errorMessage,
          finishedAt: syncRuns.finishedAt,
          id: syncRuns.id,
          logPath: syncRuns.logPath,
          repositoryId: syncRuns.repositoryId,
          repositoryName: repositories.name,
          repositoryRemoteUrl: repositories.remoteUrl,
          startCommitSha: syncRuns.startCommitSha,
          startedAt: syncRuns.startedAt,
          status: syncRuns.status,
          summaryJson: syncRuns.summaryJson
        })
        .from(syncRuns)
        .innerJoin(repositories, eq(repositories.id, syncRuns.repositoryId))
        .orderBy(desc(syncRuns.startedAt), desc(syncRuns.id));

      return rows.map((row) => ({
        endCommitSha: row.endCommitSha,
        errorMessage: row.errorMessage,
        finishedAt: row.finishedAt?.toISOString() ?? null,
        id: row.id,
        logPath: row.logPath,
        repositoryId: row.repositoryId,
        repositoryName: row.repositoryName,
        repositoryRemoteUrl: row.repositoryRemoteUrl,
        scan: parseScanSummary(row.summaryJson),
        startCommitSha: row.startCommitSha,
        startedAt: row.startedAt.toISOString(),
        status: normalizeSyncRunStatus(row.status),
        summaryJson: row.summaryJson
      }));
    }
  };
};

const normalizeSyncRunStatus = (status: string): SourceSyncRunStatus => {
  if (status === "failed" || status === "interrupted" || status === "running") {
    return status;
  }

  return "success";
};

const parseScanSummary = (summaryJson: string): RepositoryScanSummary => {
  try {
    const parsed = JSON.parse(summaryJson) as unknown;

    return normalizeScanSummary(extractScanSummary(parsed));
  } catch {
    return EMPTY_REPOSITORY_SCAN_SUMMARY;
  }
};

const extractScanSummary = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as { scan?: unknown };

  if (record.scan) {
    return record.scan;
  }

  return value;
};

const normalizeScanSummary = (scan: unknown): RepositoryScanSummary => {
  if (!scan || typeof scan !== "object") {
    return EMPTY_REPOSITORY_SCAN_SUMMARY;
  }

  return normalizeRepositoryScanSummary(scan);
};
