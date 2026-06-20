import { ipcMain } from "electron";

import type { SyncHistoryListResult } from "../../core/repositories/sync-history-api.js";
import { createSyncHistoryRepository } from "../../db/repositories/syncHistoryRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

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
