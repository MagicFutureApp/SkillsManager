import { ipcMain } from "electron";
import { createProviderRepository } from "../../db/repositories/providerRepository.js";
import type { ProviderApiRecord } from "../../core/providers/provider-api.js";
import type { createDbClient } from "../../db/client.js";

export type ProvidersListResult = {
  providers: ProviderApiRecord[];
};

type DbClient = ReturnType<typeof createDbClient>;
type DbProvider = DbClient | (() => DbClient);

export const getProviders = async (db: DbClient): Promise<ProvidersListResult> => {
  const providerRepository = createProviderRepository(db);

  return {
    providers: await providerRepository.list()
  };
};

export const registerProvidersIpc = (db: DbProvider): void => {
  ipcMain.handle("providers:list", (): Promise<ProvidersListResult> => {
    return getProviders(resolveDb(db));
  });
};

const resolveDb = (db: DbProvider): DbClient => {
  return typeof db === "function" ? db() : db;
};
