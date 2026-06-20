import { desc, eq } from "drizzle-orm";

import type { RepositoryScanSummary } from "../../core/repositories/repository-api";
import type {
  SourceSyncRunRecord,
  SourceSyncRunStatus
} from "../../core/repositories/sync-history-api";
import type { createDbClient } from "../client";
import { repositories, syncRuns } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

const defaultScanSummary: RepositoryScanSummary = {
  added: 0,
  changed: 0,
  removed: 0,
  warnings: 0
};

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
    return defaultScanSummary;
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
    return defaultScanSummary;
  }

  const partial = scan as Partial<RepositoryScanSummary>;

  return {
    added: typeof partial.added === "number" ? partial.added : 0,
    changed: typeof partial.changed === "number" ? partial.changed : 0,
    removed: typeof partial.removed === "number" ? partial.removed : 0,
    warnings: typeof partial.warnings === "number" ? partial.warnings : 0
  };
};
