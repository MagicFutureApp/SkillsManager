import { count, desc, eq } from "drizzle-orm";

import type {
  SourceSyncRunRecord,
  SourceSyncRunStatus
} from "../../core/repositories/sync-history-api";
import { parseRepositoryScanSummaryJson } from "../../core/repositories/repository-utils";
import type { createDbClient } from "../client";
import { repositories, syncRuns } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

export const createSyncHistoryRepository = (db: DbClient) => {
  return {
    async count(): Promise<number> {
      const rows = await db
        .select({ value: count() })
        .from(syncRuns)
        .innerJoin(repositories, eq(repositories.id, syncRuns.repositoryId));

      return rows[0]?.value ?? 0;
    },

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
        scan: parseRepositoryScanSummaryJson(row.summaryJson),
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
