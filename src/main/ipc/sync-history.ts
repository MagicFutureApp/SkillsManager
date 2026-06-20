import { ipcMain } from "electron";

import type { SyncHistoryListResult } from "../../core/repositories/sync-history-api.js";
import type { createDbClient } from "../../db/client.js";
import { createSyncHistoryRepository } from "../../db/repositories/syncHistoryRepository.js";

type DbClient = ReturnType<typeof createDbClient>;
type DbProvider = DbClient | (() => DbClient);

export const getSyncHistory = async (db: DbClient): Promise<SyncHistoryListResult> => {
  const syncHistoryRepository = createSyncHistoryRepository(db);

  return {
    syncRuns: await syncHistoryRepository.list()
  };
};

export const registerSyncHistoryIpc = (db: DbProvider): void => {
  ipcMain.handle("syncHistory:list", (): Promise<SyncHistoryListResult> => {
    return getSyncHistory(resolveDb(db));
  });
};

const resolveDb = (db: DbProvider): DbClient => {
  return typeof db === "function" ? db() : db;
};
